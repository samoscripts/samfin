package pl.samsoft.samfin;

import android.content.Intent;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * SamFin ładuje UI z https://fin.samsoft.pl/app/ (remote URL).
 *
 * Serwer używa certyfikatu self-signed — Android WebView domyślnie blokuje takie HTTPS
 * (czarny ekran). Akceptujemy wyłącznie fin.samsoft.pl do czasu wdrożenia Let's Encrypt.
 *
 * @see docs/decisions.md — docelowo prawdziwy certyfikat SSL na hostingu.
 */
public class MainActivity extends BridgeActivity {

    private static final String TRUSTED_HOST = "fin.samsoft.pl";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CsvIntentPlugin.class);
        super.onCreate(savedInstanceState);
        CsvIntentPlugin.handleIntent(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        CsvIntentPlugin.handleIntent(this, intent);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() == null) {
            return;
        }

        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                String url = error.getUrl();
                if (url != null && url.contains(TRUSTED_HOST)) {
                    handler.proceed();
                    return;
                }
                super.onReceivedSslError(view, handler, error);
            }
        });
    }
}
