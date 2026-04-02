/**
 * BackDay.jsx
 * Page de saisie rétroactive (Back-Day)
 * Dual-layout Mobile + Desktop
 */

import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import useBackDay, { ONGLETS } from "@/hooks/useBackDay";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, LayoutList, Lock, Ban } from "lucide-react";
import BackDayBandeau from "@/components/backDay/BackDayBandeau";
import { MobileOngletCommandes, DesktopOngletCommandes } from "@/components/backDay/OngletCommandes";
import OngletSynthese from "@/components/backDay/OngletSynthese";
import OngletCloture from "@/components/backDay/OngletCloture";
import CalendrierBackDay from "@/components/backDay/CalendrierBackDay";

// ─── Message de blocage ───────────────────────────────────────────────────────

const OngletBloque = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
    <Ban className="w-10 h-10 text-muted-foreground opacity-40" />
    <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
  </div>
);

// ─── Onglets config ───────────────────────────────────────────────────────────

const ONGLETS_CONFIG = [
  { value: ONGLETS.COMMANDES, label: "Commandes", icon: ClipboardList },
  { value: ONGLETS.SYNTHESE,  label: "Synthèse",  icon: LayoutList },
  { value: ONGLETS.CLOTURE,   label: "Clôture",   icon: Lock },
];

// ─── Version Mobile ───────────────────────────────────────────────────────────

const MobileBackDay = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const hook = useBackDay();
  const {
    selectedDate, changerDate,
    allerJourPrecedent, allerJourSuivant, peutAllerSuivant,
    formatDateFr, statutJournee, loadingStatut,
    ongletActif, setOngletActif,
    hasSynthese, hasCommandes,
  } = hook;

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={{ display: visible ? "flex" : "none" }}>

      {/* Bandeau date */}
      <BackDayBandeau
        selectedDate={selectedDate}
        dateLabel={formatDateFr(selectedDate)}
        onPrev={allerJourPrecedent}
        onNext={allerJourSuivant}
        canGoNext={peutAllerSuivant}
        statutJournee={statutJournee}
        loading={loadingStatut}
      />

      {/* Onglets + Contenu */}
      <Tabs
        value={ongletActif}
        onValueChange={setOngletActif}
        className="flex flex-col flex-1 min-h-0">

        {/* Tabs fixes en haut (sous le bandeau) */}
        <TabsList className="grid grid-cols-3 rounded-none border-b h-11 shrink-0 bg-background">
          {ONGLETS_CONFIG.map(({ value, label, icon: Icon }) => {
            const disabled =
              (value === ONGLETS.COMMANDES && hasSynthese) ||
              (value === ONGLETS.SYNTHESE && hasCommandes);
            return (
              <TabsTrigger
                key={value}
                value={value}
                disabled={disabled}
                className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value={ONGLETS.COMMANDES} className="mt-0 h-full">
            {hasSynthese
              ? <OngletBloque message="Une synthèse de journée a déjà été enregistrée. L'ajout de commandes individuelles n'est pas possible pour cette journée." />
              : <MobileOngletCommandes hook={hook} />}
          </TabsContent>

          <TabsContent value={ONGLETS.SYNTHESE} className="mt-0">
            {hasCommandes
              ? <OngletBloque message="Des commandes individuelles ont déjà été enregistrées pour cette journée. La synthèse globale n'est pas disponible." />
              : <OngletSynthese hook={hook} />}
          </TabsContent>

          <TabsContent value={ONGLETS.CLOTURE} className="mt-0">
            <OngletCloture hook={hook} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// ─── Version Desktop ──────────────────────────────────────────────────────────

const DesktopBackDay = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const hook = useBackDay();
  const {
    selectedDate, changerDate,
    allerJourPrecedent, allerJourSuivant, peutAllerSuivant,
    formatDateFr, statutJournee, loadingStatut,
    ongletActif, setOngletActif,
    joursCalendrier,
    hasSynthese, hasCommandes,
  } = hook;

  return (
    <div
      className="min-h-screen flex flex-col bg-muted/30"
      style={{ display: visible ? "flex" : "none" }}>

      {/* Header */}
      <div className="bg-background border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 max-w-[1800px] mx-auto">
          <div>
            <h1 className="text-xl font-semibold">Back-Day</h1>
            <p className="text-xs text-muted-foreground">Saisie rétroactive des données d'activité</p>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden max-w-[1800px] mx-auto w-full p-4 gap-4">

        {/* Colonne gauche : Calendrier */}
        <div className="w-56 xl:w-64 shrink-0 bg-background rounded-xl border border-border overflow-hidden">
          <CalendrierBackDay
            jours={joursCalendrier}
            selectedDate={selectedDate}
            onSelectDate={changerDate}
          />
        </div>

        {/* Colonne principale */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Bandeau date */}
          <BackDayBandeau
            selectedDate={selectedDate}
            dateLabel={formatDateFr(selectedDate)}
            onPrev={allerJourPrecedent}
            onNext={allerJourSuivant}
            canGoNext={peutAllerSuivant}
            statutJournee={statutJournee}
            loading={loadingStatut}
            className="rounded-xl border border-border mb-4 bg-background"
          />

          {/* Onglets + Contenu */}
          <Tabs
            value={ongletActif}
            onValueChange={setOngletActif}
            className="flex flex-col flex-1 min-h-0">

            <TabsList className="grid grid-cols-3 w-80 mb-4 shrink-0">
              {ONGLETS_CONFIG.map(({ value, label, icon: Icon }) => {
                const disabled =
                  (value === ONGLETS.COMMANDES && hasSynthese) ||
                  (value === ONGLETS.SYNTHESE && hasCommandes);
                return (
                  <TabsTrigger
                    key={value}
                    value={value}
                    disabled={disabled}
                    className="flex items-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value={ONGLETS.COMMANDES} className="mt-0 h-full">
                {hasSynthese
                  ? <OngletBloque message="Une synthèse de journée a déjà été enregistrée. L'ajout de commandes individuelles n'est pas possible pour cette journée." />
                  : <DesktopOngletCommandes hook={hook} />}
              </TabsContent>

              <TabsContent value={ONGLETS.SYNTHESE} className="mt-0 overflow-y-auto h-full">
                <div className="max-w-2xl">
                  {hasCommandes
                    ? <OngletBloque message="Des commandes individuelles ont déjà été enregistrées pour cette journée. La synthèse globale n'est pas disponible." />
                    : <OngletSynthese hook={hook} />}
                </div>
              </TabsContent>

              <TabsContent value={ONGLETS.CLOTURE} className="mt-0 overflow-y-auto h-full">
                <div className="max-w-xl">
                  <OngletCloture hook={hook} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

const BackDay = () => {
  return (
    <>
      <MobileBackDay />
      <DesktopBackDay />
    </>
  );
};

export default BackDay;
