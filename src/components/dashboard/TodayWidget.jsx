import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Sun,
  MapPin,
  Clock,
  Target,
  Tag,
  Store,
  Percent,
} from "lucide-react";
import { getAllEmplacements } from "@/utils/emplacementToolkit";
import { getAllPromotionInstances } from "@/utils/promotionToolkit";
import useActiveUserStore from "@/store/activeUserStore";

const TodayWidget = ({ isMobile = false }) => {
  const { user } = useActiveUserStore();
  const [emplacements, setEmplacements] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si l'utilisateur est superviseur ou admin
  const isSupervisorOrAdmin =
    user?.role === "superviseur" || user?.role === "admin";

  // Date du jour
  const today = new Date();
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const formattedDate = today.toLocaleDateString("fr-FR", options);

  // Jour de la semaine en minuscule pour les horaires
  const jourSemaine = today
    .toLocaleDateString("fr-FR", { weekday: "long" })
    .toLowerCase();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // Charger les emplacements actifs
    const { emplacements: emplacementsData } = await getAllEmplacements({
      statut: "actif",
    });
    setEmplacements(emplacementsData || []);

    // Charger les promotions actives
    const { instances: promotionsData } = await getAllPromotionInstances({
      filter: "active",
    });
    setPromotions(promotionsData || []);

    setIsLoading(false);
  };

  // Obtenir les horaires du jour pour un emplacement
  const getHorairesJour = (horaires) => {
    if (!horaires || !horaires[jourSemaine]) {
      return { ouverture: null, fermeture: null };
    }
    return horaires[jourSemaine];
  };

  // Vérifier si un emplacement est ouvert maintenant
  const isOpenNow = (horaires) => {
    const { ouverture, fermeture } = getHorairesJour(horaires);
    if (!ouverture || !fermeture) return false;

    const now = today.getHours() * 60 + today.getMinutes();
    const [openH, openM] = ouverture.split(":").map(Number);
    const [closeH, closeM] = fermeture.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return now >= openMinutes && now <= closeMinutes;
  };

  // Objectifs de vente (placeholder - à implémenter avec une vraie source de données)
  const objectifsVente = [
    { label: "Objectif journalier", valeur: "150 000 FCFA", progression: 65 },
    { label: "Objectif hebdomadaire", valeur: "900 000 FCFA", progression: 45 },
  ];

  if (isLoading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
          <div className="flex items-center justify-between">
            <CardTitle
              className={`${
                isMobile ? "text-base" : "text-lg"
              } font-semibold text-foreground`}>
              Aujourd'hui
            </CardTitle>
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
              <Sun
                className={`${
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                } text-amber-600 dark:text-amber-400`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`${
              isMobile ? "text-base" : "text-lg"
            } font-semibold text-foreground`}>
            Aujourd'hui
          </CardTitle>
          <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
            <Sun
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-amber-600 dark:text-amber-400`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "px-4 pb-4 space-y-4" : "space-y-5"}>
        {/* Date du jour */}
        <div className="flex items-center gap-3">
          <Calendar
            className={`${
              isMobile ? "w-5 h-5" : "w-6 h-6"
            } text-amber-600 dark:text-amber-400`}
          />
          <p
            className={`${
              isMobile ? "text-sm" : "text-base"
            } font-medium text-foreground capitalize`}>
            {formattedDate}
          </p>
        </div>

        {/* Emplacements ouverts */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Store
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-emerald-600 dark:text-emerald-400`}
            />
            <span
              className={`${
                isMobile ? "text-xs" : "text-sm"
              } font-medium text-foreground`}>
              Emplacements ouverts
            </span>
          </div>
          <div
            className={`bg-background/60 rounded-lg border border-border overflow-hidden ${
              isMobile ? "max-h-32" : "max-h-40"
            } overflow-y-auto`}>
            {emplacements.length === 0 ? (
              <p
                className={`${
                  isMobile ? "text-xs p-2" : "text-sm p-3"
                } text-muted-foreground text-center`}>
                Aucun emplacement actif
              </p>
            ) : (
              <table className="w-full">
                <thead
                  className={`bg-muted/50 sticky top-0 ${
                    isMobile ? "text-[10px]" : "text-xs"
                  }`}>
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">
                      Nom
                    </th>
                    <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">
                      Horaires
                    </th>
                    <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className={isMobile ? "text-[10px]" : "text-xs"}>
                  {emplacements.map((emp) => {
                    const horaires = getHorairesJour(emp.horaires);
                    const isOpen = isOpenNow(emp.horaires);
                    return (
                      <tr
                        key={emp.id}
                        className="border-t border-border hover:bg-muted/30">
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[80px]">
                              {emp.nom}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-2 py-1.5">
                          {horaires.ouverture && horaires.fermeture ? (
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {horaires.ouverture} - {horaires.fermeture}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Fermé</span>
                          )}
                        </td>
                        <td className="text-center px-2 py-1.5">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Ouvert
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Fermé
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Objectifs de vente (superviseur/admin uniquement) */}
        {isSupervisorOrAdmin && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target
                className={`${
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                } text-blue-600 dark:text-blue-400`}
              />
              <span
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-medium text-foreground`}>
                Objectifs de vente
              </span>
            </div>
            <div className="bg-background/60 rounded-lg border border-border p-2 space-y-2">
              {objectifsVente.map((obj, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`${
                        isMobile ? "text-[10px]" : "text-xs"
                      } text-muted-foreground`}>
                      {obj.label}
                    </span>
                    <span
                      className={`${
                        isMobile ? "text-[10px]" : "text-xs"
                      } font-medium text-foreground`}>
                      {obj.valeur}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${obj.progression}%` }}
                    />
                  </div>
                  <p
                    className={`${
                      isMobile ? "text-[10px]" : "text-xs"
                    } text-right text-muted-foreground`}>
                    {obj.progression}% atteint
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promotions en cours */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-rose-600 dark:text-rose-400`}
            />
            <span
              className={`${
                isMobile ? "text-xs" : "text-sm"
              } font-medium text-foreground`}>
              Promotions en cours
            </span>
            {promotions.length > 0 && (
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400`}>
                {promotions.length}
              </span>
            )}
          </div>
          <div
            className={`bg-background/60 rounded-lg border border-border ${
              isMobile ? "max-h-24" : "max-h-32"
            } overflow-y-auto`}>
            {promotions.length === 0 ? (
              <p
                className={`${
                  isMobile ? "text-xs p-2" : "text-sm p-3"
                } text-muted-foreground text-center`}>
                Aucune promotion active
              </p>
            ) : (
              <div className="divide-y divide-border">
                {promotions.slice(0, 5).map((promo) => (
                  <div
                    key={promo.id}
                    className={`flex items-center justify-between ${
                      isMobile ? "px-2 py-1.5" : "px-3 py-2"
                    } hover:bg-muted/30`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Percent
                        className={`${
                          isMobile ? "w-3 h-3" : "w-4 h-4"
                        } text-rose-500 shrink-0`}
                      />
                      <span
                        className={`${
                          isMobile ? "text-[10px]" : "text-xs"
                        } font-medium text-foreground truncate`}>
                        {promo.denomination}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {promo.reduction_relative > 0 && (
                        <span
                          className={`${
                            isMobile ? "text-[10px]" : "text-xs"
                          } font-semibold text-rose-600 dark:text-rose-400`}>
                          -{promo.reduction_relative}%
                        </span>
                      )}
                      {promo.reduction_absolue > 0 && (
                        <span
                          className={`${
                            isMobile ? "text-[10px]" : "text-xs"
                          } font-semibold text-rose-600 dark:text-rose-400`}>
                          -{promo.reduction_absolue} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {promotions.length > 5 && (
                  <p
                    className={`${
                      isMobile ? "text-[10px] px-2 py-1" : "text-xs px-3 py-1.5"
                    } text-center text-muted-foreground`}>
                    +{promotions.length - 5} autres promotions
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayWidget;
