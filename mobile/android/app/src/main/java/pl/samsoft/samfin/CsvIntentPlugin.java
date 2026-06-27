package pl.samsoft.samfin;

import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Przechowuje plik CSV otwarty przez ACTION_VIEW (np. „Otwórz za pomocą” z mBanku).
 */
@CapacitorPlugin(name = "CsvIntent")
public class CsvIntentPlugin extends Plugin {

    private static final String CACHE_DIR = "csv-intent";
    private static final String CACHE_FILE = "pending.csv";

    private static volatile PendingCsv pending;

    static void handleIntent(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }

        Uri uri = intent.getData();
        if (uri == null) {
            return;
        }

        try {
            PendingCsv next = copyToCache(context, uri);
            if (next != null) {
                pending = next;
            }
        } catch (IOException e) {
            pending = null;
        }
    }

    private static PendingCsv copyToCache(Context context, Uri uri) throws IOException {
        ContentResolver resolver = context.getContentResolver();
        File dir = new File(context.getCacheDir(), CACHE_DIR);
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Cannot create cache dir");
        }

        File dest = new File(dir, CACHE_FILE);
        try (InputStream in = resolver.openInputStream(uri);
             FileOutputStream out = new FileOutputStream(dest, false)) {
            if (in == null) {
                throw new IOException("Cannot open input stream");
            }
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }

        String fileName = resolveDisplayName(resolver, uri);
        if (fileName == null || fileName.isBlank()) {
            fileName = "import.csv";
        }

        String mimeType = resolver.getType(uri);
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = "text/csv";
        }

        return new PendingCsv(dest, fileName, mimeType);
    }

    private static String resolveDisplayName(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
            if (cursor == null) {
                return null;
            }
            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            if (nameIndex < 0 || !cursor.moveToFirst()) {
                return null;
            }
            return cursor.getString(nameIndex);
        }
    }

    private static void clearCache(Context context) {
        pending = null;
        File file = new File(new File(context.getCacheDir(), CACHE_DIR), CACHE_FILE);
        if (file.exists()) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
    }

    @PluginMethod
    public void getPendingFile(PluginCall call) {
        JSObject ret = new JSObject();
        PendingCsv current = pending;
        if (current != null && current.file.exists()) {
            ret.put("fileName", current.fileName);
            ret.put("mimeType", current.mimeType);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void readPendingFile(PluginCall call) {
        PendingCsv current = pending;
        if (current == null || !current.file.exists()) {
            call.reject("Brak oczekującego pliku CSV");
            return;
        }

        try (FileInputStream in = new FileInputStream(current.file)) {
            byte[] bytes = readAllBytes(in);
            JSObject ret = new JSObject();
            ret.put("fileName", current.fileName);
            ret.put("mimeType", current.mimeType);
            ret.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Nie udało się odczytać pliku CSV", e);
        }
    }

    @PluginMethod
    public void clearPendingFile(PluginCall call) {
        clearCache(getContext());
        call.resolve();
    }

    private static byte[] readAllBytes(InputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = in.read(chunk)) != -1) {
            buffer.write(chunk, 0, read);
        }
        return buffer.toByteArray();
    }

    private static final class PendingCsv {
        final File file;
        final String fileName;
        final String mimeType;

        PendingCsv(File file, String fileName, String mimeType) {
            this.file = file;
            this.fileName = fileName;
            this.mimeType = mimeType;
        }
    }
}
