import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Settings, Save, Eye, EyeOff } from "lucide-react";

/**
 * Carte de configuration d'un provider de paiement
 */
const PaymentProviderCard = ({ provider, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const [formData, setFormData] = useState({
    api_key: provider?.api_key || "",
    api_secret: provider?.api_secret || "",
    is_active: provider?.is_active || false,
    is_sandbox: provider?.is_sandbox ?? true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(provider.id, formData);
      setEditing(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      api_key: provider?.api_key || "",
      api_secret: provider?.api_secret || "",
      is_active: provider?.is_active || false,
      is_sandbox: provider?.is_sandbox ?? true,
    });
    setEditing(false);
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>{provider.display_name}</CardTitle>
              <CardDescription className="mt-1">
                {provider.provider_name === "kkiapay" && "Agrégateur de paiement mobile money"}
                {provider.provider_name === "feexpay" && "Solution de paiement mobile et carte"}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={provider.is_active ? "default" : "secondary"}>
              {provider.is_active ? "Actif" : "Inactif"}
            </Badge>
            <Badge variant={provider.is_sandbox ? "outline" : "destructive"}>
              {provider.is_sandbox ? "Sandbox" : "Production"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!editing ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clé API publique</span>
                <span className="text-sm text-muted-foreground">
                  {provider.api_key ? "Configurée" : "Non configurée"}
                </span>
              </div>
              {provider.api_secret && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clé API secrète</span>
                  <span className="text-sm text-muted-foreground">Configurée</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setEditing(true)} variant="outline" className="flex-1">
                <Settings className="mr-2 h-4 w-4" />
                Configurer
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {/* Clé API publique */}
              <div className="space-y-2">
                <Label htmlFor={`api_key_${provider.id}`}>Clé API publique</Label>
                <div className="relative">
                  <Input
                    id={`api_key_${provider.id}`}
                    type={showApiKey ? "text" : "password"}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Votre clé API publique"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Clé API secrète */}
              <div className="space-y-2">
                <Label htmlFor={`api_secret_${provider.id}`}>
                  Clé API secrète (optionnel)
                </Label>
                <div className="relative">
                  <Input
                    id={`api_secret_${provider.id}`}
                    type={showApiSecret ? "text" : "password"}
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    placeholder="Votre clé API secrète"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Mode Sandbox */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor={`sandbox_${provider.id}`}>Mode Sandbox</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer le mode test pour les paiements
                  </p>
                </div>
                <Switch
                  id={`sandbox_${provider.id}`}
                  checked={formData.is_sandbox}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_sandbox: checked })
                  }
                />
              </div>

              {/* Activation du provider */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor={`active_${provider.id}`}>Activer le provider</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre les paiements via {provider.display_name}
                  </p>
                </div>
                <Switch
                  id={`active_${provider.id}`}
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>Sauvegarde...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={saving}>
                Annuler
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentProviderCard;
