/**
 * ClotureJournaliereView.jsx
 * Vue clôture journalière dans le module comptabilité.
 * Affiche le résumé financier du jour (opérations + commandes) et
 * liste les clôtures passées.
 */

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Smartphone,
  Banknote,
  CreditCard,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import {
  getCommandesByDate,
  getDayClosureByDate,
  getAllDayClosures,
  calculateDayMetrics,
  saveDayClosure,
} from "@/utils/dayClosureToolkit";
import useActiveUserStore from "@/store/activeUserStore";

const formatMontant = (montant) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(montant || 0)) + " FCFA";

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatDateShort = (dateString) =>
  new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, icon: Icon, colorClass, subLabel }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colorClass}`} />
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
      {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
    </CardContent>
  </Card>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const ClotureJournaliereView = () => {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useActiveUserStore();

  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Données du jour
  const [encaissements, setEncaissements] = useState(0);
  const [depenses, setDepenses] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [existingClosure, setExistingClosure] = useState(null);
  const [notes, setNotes] = useState("");

  // Historique
  const [historique, setHistorique] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [histPage, setHistPage] = useState(0);
  const HIST_LIMIT = 10;

  const isToday = selectedDate === today;

  // Charger les données du jour sélectionné
  const fetchDayData = useCallback(async () => {
    setLoading(true);
    try {
      const [opsEncaissement, opsDepense, commandes, closure] = await Promise.all([
        comptabiliteToolkit.getSommeOperations({
          operation: comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT,
          startDate: selectedDate,
          endDate: selectedDate,
        }),
        comptabiliteToolkit.getSommeOperations({
          operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
          startDate: selectedDate,
          endDate: selectedDate,
        }),
        getCommandesByDate(selectedDate),
        getDayClosureByDate(selectedDate),
      ]);

      setEncaissements(opsEncaissement?.somme || 0);
      setDepenses(opsDepense?.somme || 0);
      setMetrics(await calculateDayMetrics(commandes));
      setExistingClosure(closure);
      if (closure?.notes) setNotes(closure.notes);
    } catch (error) {
      console.error("Erreur chargement données jour:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  // Charger l'historique des clôtures
  const fetchHistorique = useCallback(async () => {
    setLoadingHistorique(true);
    try {
      const data = await getAllDayClosures(HIST_LIMIT, histPage * HIST_LIMIT);
      setHistorique(data);
    } catch (error) {
      console.error("Erreur historique:", error);
    } finally {
      setLoadingHistorique(false);
    }
  }, [histPage]);

  useEffect(() => {
    fetchHistorique();
  }, [fetchHistorique]);

  const handleSaveClosure = async () => {
    if (!metrics) return;
    setSaving(true);
    try {
      await saveDayClosure(metrics, user?.id, notes);
      await fetchDayData();
      await fetchHistorique();
    } catch (error) {
      console.error("Erreur sauvegarde clôture:", error);
    } finally {
      setSaving(false);
    }
  };

  const revenuNet = encaissements - depenses;
  const resteAPayer = metrics
    ? (metrics.chiffre_affaires || 0) -
      (metrics.montant_percu_momo || 0) -
      (metrics.montant_percu_cash || 0) -
      (metrics.montant_percu_autre || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header + sélecteur de date */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6" />
            Clôture journalière
          </h2>
          <p className="text-sm text-muted-foreground">
            {isToday ? "Résumé de la journée en cours" : `Journée du ${formatDate(selectedDate)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button variant="outline" size="icon" onClick={fetchDayData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPIs financiers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Encaissements"
              value={formatMontant(encaissements)}
              icon={TrendingUp}
              colorClass="text-emerald-600"
            />
            <KpiCard
              label="Dépenses"
              value={formatMontant(depenses)}
              icon={TrendingDown}
              colorClass="text-red-600"
            />
            <KpiCard
              label="Revenu net"
              value={formatMontant(revenuNet)}
              icon={TrendingUp}
              colorClass={revenuNet >= 0 ? "text-blue-600" : "text-red-600"}
            />
            <KpiCard
              label="CA Commandes"
              value={formatMontant(metrics?.chiffre_affaires)}
              icon={ShoppingBag}
              colorClass="text-violet-600"
              subLabel={`${metrics?.nombre_ventes_total ?? 0} commandes`}
            />
            <KpiCard
              label="Reste à percevoir"
              value={formatMontant(Math.max(0, resteAPayer))}
              icon={AlertTriangle}
              colorClass={resteAPayer > 0 ? "text-amber-600" : "text-emerald-600"}
              subLabel="sur commandes"
            />
          </div>

          {/* Détail paiements commandes */}
          {metrics && metrics.nombre_ventes_total > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Paiements reçus · Commandes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Mobile Money</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatMontant(metrics.montant_percu_momo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Espèces</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatMontant(metrics.montant_percu_cash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Autre</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatMontant(metrics.montant_percu_autre)}
                    </span>
                  </div>
                </div>

                {metrics.meilleur_produit_nom && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Meilleur produit · </span>
                        <span className="font-medium">{metrics.meilleur_produit_nom}</span>
                        <span className="text-muted-foreground ml-1">
                          ({metrics.meilleur_produit_quantite} vendu{metrics.meilleur_produit_quantite > 1 ? "s" : ""})
                        </span>
                      </div>
                      {metrics.panier_moyen > 0 && (
                        <div>
                          <span className="text-muted-foreground">Panier moyen · </span>
                          <span className="font-medium">{formatMontant(metrics.panier_moyen)}</span>
                        </div>
                      )}
                      {metrics.meilleur_point_vente_nom && (
                        <div>
                          <span className="text-muted-foreground">Meilleur point de vente · </span>
                          <span className="font-medium">{metrics.meilleur_point_vente_nom}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions clôture */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Enregistrer la clôture
                {existingClosure && (
                  <Badge className="bg-emerald-500 text-white ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Clôturée
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingClosure && (
                <div className="text-xs text-muted-foreground">
                  Dernière clôture :{" "}
                  {new Date(existingClosure.cloture_a).toLocaleString("fr-FR")}
                  {existingClosure.cloture_par_info && (
                    <> · {existingClosure.cloture_par_info.prenoms} {existingClosure.cloture_par_info.nom}</>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optionnel)</label>
                <Input
                  placeholder="Observations, incidents, remarques du jour..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveClosure}
                disabled={saving || (metrics?.nombre_ventes_total === 0 && !existingClosure)}
                className="w-full sm:w-auto">
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>
                ) : existingClosure ? (
                  <><RefreshCw className="h-4 w-4 mr-2" />Mettre à jour la clôture</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" />Clôturer la journée</>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Historique des clôtures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des clôtures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistorique ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historique.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune clôture enregistrée
            </p>
          ) : (
            <>
              {/* Table desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Commandes</th>
                      <th className="text-right p-3 font-medium">CA</th>
                      <th className="text-right p-3 font-medium">Panier moyen</th>
                      <th className="text-left p-3 font-medium">Clôturé par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historique.map((c) => (
                      <tr
                        key={c.jour}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDate(c.jour)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateShort(c.jour)}
                          </div>
                        </td>
                        <td className="p-3 text-right">{c.nombre_ventes_total ?? 0}</td>
                        <td className="p-3 text-right font-medium text-emerald-600">
                          {formatMontant(c.chiffre_affaires)}
                        </td>
                        <td className="p-3 text-right">{formatMontant(c.panier_moyen)}</td>
                        <td className="p-3 text-muted-foreground">
                          {c.cloture_par_info
                            ? `${c.cloture_par_info.prenoms} ${c.cloture_par_info.nom}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="md:hidden divide-y">
                {historique.map((c) => (
                  <div
                    key={c.jour}
                    className="p-4 space-y-1 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedDate(c.jour)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatDateShort(c.jour)}</span>
                      <span className="text-emerald-600 font-semibold text-sm">
                        {formatMontant(c.chiffre_affaires)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.nombre_ventes_total ?? 0} commandes</span>
                      <span>·</span>
                      <span>Panier: {formatMontant(c.panier_moyen)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination historique */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                  disabled={histPage === 0 || loadingHistorique}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Page {histPage + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistPage((p) => p + 1)}
                  disabled={historique.length < HIST_LIMIT || loadingHistorique}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClotureJournaliereView;
