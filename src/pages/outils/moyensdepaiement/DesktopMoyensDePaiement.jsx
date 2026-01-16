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

const DesktopMoyensDePaiement = () => {
  const { isDesktop } = useBreakpoint();
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
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moyens de paiement</h1>
        <p className="text-muted-foreground mt-2">
          Configurez et gérez les agrégateurs de paiement KKiaPay et FeeXpay
        </p>
      </div>

      {/* Erreur globale */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube2 className="h-4 w-4 mr-2" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Configuration */}
        <TabsContent value="configuration" className="space-y-6 mt-6">
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              Configurez vos clés API pour chaque agrégateur. Les clés peuvent être saisies ici ou
              définies dans les variables d'environnement (.env).
            </AlertDescription>
          </Alert>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chargement des providers...
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
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
        <TabsContent value="test" className="space-y-6 mt-6">
          <Alert>
            <TestTube2 className="h-4 w-4" />
            <AlertDescription>
              Testez les paiements en mode sandbox sans effectuer de vraies transactions. Assurez-vous
              que le mode sandbox est activé pour chaque provider.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            {providers
              ?.filter((p) => p.is_active)
              .map((provider) => (
                <PaymentTestInterface key={provider.id} provider={provider} />
              ))}

            {providers?.filter((p) => p.is_active).length === 0 && (
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Aucun provider actif</CardTitle>
                  <CardDescription>
                    Activez au moins un provider dans la section Configuration pour effectuer des
                    tests.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history" className="space-y-6 mt-6">
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

export default DesktopMoyensDePaiement;
