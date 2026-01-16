import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Settings, History, TestTube2, AlertCircle } from "lucide-react";
import { usePaymentProviders } from "@/hooks/usePaymentProviders";
import { usePaymentTransactions } from "@/hooks/usePaymentTransactions";
import PaymentProviderCard from "@/components/payments/PaymentProviderCard";
import PaymentTestInterface from "@/components/payments/PaymentTestInterface";
import TransactionHistoryTable from "@/components/payments/TransactionHistoryTable";

const MobileMoyensDePaiement = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("configuration");

  const { providers, loading, error, updateProvider } = usePaymentProviders();
  const {
    transactions,
    loading: loadingTransactions,
    refresh: refreshTransactions,
  } = usePaymentTransactions({
    limit: 50,
  });

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-4 p-4 pb-24"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moyens de paiement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez KKiaPay et FeeXpay
        </p>
      </div>

      {/* Erreur globale */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Config
          </TabsTrigger>
          <TabsTrigger value="test" className="text-xs">
            <TestTube2 className="h-3 w-3 mr-1" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Configuration */}
        <TabsContent value="configuration" className="space-y-4 mt-4">
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Configurez vos clés API pour chaque agrégateur.
            </AlertDescription>
          </Alert>

          {loading ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Chargement...
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {providers?.map((provider) => (
                <PaymentProviderCard
                  key={provider.id}
                  provider={provider}
                  onUpdate={updateProvider}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tests */}
        <TabsContent value="test" className="space-y-4 mt-4">
          <Alert>
            <TestTube2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Testez les paiements en mode sandbox.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {providers
              ?.filter((p) => p.is_active)
              .map((provider) => (
                <PaymentTestInterface key={provider.id} provider={provider} />
              ))}

            {providers?.filter((p) => p.is_active).length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aucun provider actif</CardTitle>
                  <CardDescription className="text-sm">
                    Activez au moins un provider dans Configuration.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <TransactionHistoryTable
            transactions={transactions}
            loading={loadingTransactions}
            onRefresh={refreshTransactions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileMoyensDePaiement;
