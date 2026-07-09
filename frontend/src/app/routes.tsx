import { Navigate, Routes, Route } from 'react-router-dom'
import Layout       from '@/layout/Layout'
import AboutApp     from '@/domains/about/pages/AboutApp'
import Dashboard    from '@/domains/home/dashboard/pages/Dashboard'
import Transactions from '@/domains/home/transactions/pages/Transactions'
import TransactionEditRedirect from '@/domains/home/transactions/pages/TransactionEditRedirect'
import TransactionNewRedirect from '@/domains/home/transactions/pages/TransactionNewRedirect'
import ReportsLayout from '@/domains/home/reports/pages/ReportsLayout'
import AnalyticsReport from '@/domains/home/reports/analytics/pages/AnalyticsReport'
import BreakdownReport from '@/domains/home/reports/breakdown/pages/BreakdownReport'
import TrendReport from '@/domains/home/reports/trend/pages/TrendReport'
import SettlementLayout from '@/domains/home/reports/settlements/pages/SettlementLayout'
import SettlementReportLayout from '@/domains/home/reports/settlements/pages/SettlementReportLayout'
import SettlementSummary from '@/domains/home/reports/settlements/pages/SettlementSummary'
import SettlementRotatingDeposits from '@/domains/home/reports/settlements/pages/SettlementRotatingDeposits'
import SettlementWallets from '@/domains/home/reports/settlements/pages/SettlementWallets'
import SettlementOwnContributions from '@/domains/home/reports/settlements/pages/SettlementOwnContributions'
import SettlementOther from '@/domains/home/reports/settlements/pages/SettlementOther'
import SettlementSettings from '@/domains/home/reports/settlements/pages/SettlementSettings'
import Settings     from '@/domains/settings/pages/Settings'
import UsersPage    from '@/domains/settings/users/pages/Users'
import SystemSettings from '@/domains/settings/system/pages/SystemSettings'
import BackupsSettings from '@/domains/settings/backups/pages/BackupsSettings'
import MyAccount    from '@/domains/settings/pages/MyAccount'
import ConfigurationLayout from '@/domains/home/configuration/pages/ConfigurationLayout'
import { LegacyGeneralConfigRedirect } from '@/domains/home/configuration/pages/LegacyGeneralConfigRedirect'
import GeneralLayout from '@/domains/home/configuration/general/pages/GeneralLayout'
import Parties from '@/domains/home/configuration/general/parties/pages/Parties'
import Wallets from '@/domains/home/configuration/general/wallets/pages/Wallets'
import Concerns from '@/domains/home/configuration/general/concerns/pages/Concerns'
import Categories from '@/domains/home/configuration/general/categories/pages/Categories'
import { CategoriesCreateRedirect, CategoriesEditRedirect } from '@/domains/home/configuration/general/categories/pages/CategoriesLegacyRedirect'
import ClassificationRules from '@/domains/home/configuration/rules/pages/ClassificationRules'
import ConfigurationDashboard from '@/domains/home/configuration/dashboard/pages/ConfigurationDashboard'
import ImportLayout    from '@/domains/home/import/pages/ImportLayout'
import ImportNowy      from '@/domains/home/import/pages/ImportNowy'
import ImportHistoria  from '@/domains/home/import/pages/ImportHistoria'
import ImportSzczegoly from '@/domains/home/import/pages/ImportSzczegoly'
import ImportBledy     from '@/domains/home/import/pages/ImportBledy'
import ImportWiersze   from '@/domains/home/import/pages/ImportWiersze'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/new" element={<TransactionNewRedirect />} />
        <Route path="transactions/:transactionId/edit" element={<TransactionEditRedirect />} />

        {/* Import CSV — url-based tab navigation */}
        <Route path="import" element={<ImportLayout />}>
          <Route index element={<Navigate to="nowy" replace />} />
          <Route path="nowy" element={<ImportNowy />} />
          <Route path="historia" element={<ImportHistoria />} />
          <Route path="historia/:id" element={<ImportSzczegoly />}>
            <Route index element={<Navigate to="bledy" replace />} />
            <Route path="bledy"   element={<ImportBledy />} />
            <Route path="wiersze" element={<ImportWiersze />} />
          </Route>
        </Route>

        <Route path="raporty" element={<ReportsLayout />}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<AnalyticsReport />} />
          <Route path="breakdown" element={<BreakdownReport />} />
          <Route path="trend" element={<TrendReport />} />
          <Route path="settlements" element={<SettlementLayout />}>
            <Route element={<SettlementReportLayout />}>
              <Route index element={<SettlementSummary />} />
              <Route path="rotacyjne" element={<SettlementRotatingDeposits />} />
              <Route path="portfele" element={<SettlementWallets />} />
              <Route path="wklady-wlasne" element={<SettlementOwnContributions />} />
              <Route path="pozostale" element={<SettlementOther />} />
            </Route>
            <Route path="settings" element={<SettlementSettings />} />
          </Route>
          {/* legacy redirects */}
          <Route path="default/monthly" element={<Navigate to="/raporty/analytics" replace />} />
          <Route path="analytics/monthly" element={<Navigate to="/raporty/analytics" replace />} />
          <Route path="common-account" element={<Navigate to="/raporty/settlements" replace />} />
          <Route path="common-account/settings" element={<Navigate to="/raporty/settlements/settings" replace />} />
          <Route path="miesieczny" element={<Navigate to="/raporty/analytics" replace />} />
          <Route path="domyslne/miesieczny" element={<Navigate to="/raporty/analytics" replace />} />
          <Route path="konto-wspolne" element={<Navigate to="/raporty/settlements" replace />} />
          <Route path="konto-wspolne/konfiguracja" element={<Navigate to="/raporty/settlements/settings" replace />} />
        </Route>

        <Route path="konfiguracja" element={<ConfigurationLayout />}>
          <Route index element={<Navigate to="ogolne/podmioty" replace />} />
          <Route path="ogolne" element={<GeneralLayout />}>
            <Route index element={<Navigate to="podmioty" replace />} />
            <Route path="podmioty">
              <Route index element={<Parties />} />
              <Route path="nowy" element={<Parties />} />
              <Route path=":entityId/edycja" element={<Parties />} />
            </Route>
            <Route path="portfele">
              <Route index element={<Wallets />} />
              <Route path="nowy" element={<Wallets />} />
              <Route path=":entityId/edycja" element={<Wallets />} />
            </Route>
            <Route path="dotyczy">
              <Route index element={<Concerns />} />
              <Route path="nowy" element={<Concerns />} />
              <Route path=":entityId/edycja" element={<Concerns />} />
            </Route>
            <Route path="kategorie">
              <Route index element={<Categories />} />
              <Route path="nowy" element={<CategoriesCreateRedirect />} />
              <Route path=":entityId/edycja" element={<CategoriesEditRedirect />} />
            </Route>
          </Route>
          <Route path="reguly">
            <Route index element={<ClassificationRules />} />
            <Route path="nowy" element={<ClassificationRules />} />
            <Route path=":entityId/edycja" element={<ClassificationRules />} />
          </Route>
          <Route path="dashboard" element={<ConfigurationDashboard />} />
          {/* legacy redirects — słowniki przeniesione pod /ogolne */}
          <Route path="podmioty/*" element={<LegacyGeneralConfigRedirect />} />
          <Route path="portfele/*" element={<LegacyGeneralConfigRedirect />} />
          <Route path="dotyczy/*" element={<LegacyGeneralConfigRedirect />} />
          <Route path="kategorie/*" element={<LegacyGeneralConfigRedirect />} />
        </Route>

        <Route path="moje-konto" element={<MyAccount />} />
        <Route path="o-aplikacji" element={<AboutApp />} />
        <Route path="ustawienia" element={<Settings />}>
          <Route index element={<Navigate to="uzytkownicy" replace />} />
          <Route path="uzytkownicy">
            <Route index element={<UsersPage />} />
            <Route path="nowy" element={<UsersPage />} />
            <Route path=":entityId/edycja" element={<UsersPage />} />
          </Route>
          <Route path="system" element={<SystemSettings />} />
          <Route path="kopie-zapasowe" element={<BackupsSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}
