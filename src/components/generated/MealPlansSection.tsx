/**
 * Wrapper de la sección "Generador de Planes".
 * Por default muestra el historial; con el botón "Nuevo plan" abre el
 * generador. Al guardarse uno nuevo se refresca el historial.
 */

import { useState } from 'react';
import GeneratedDocsList from './GeneratedDocsList';
import MealPlanGenerator from '../MealPlanGenerator';

type View = 'list' | 'editor';

export default function MealPlansSection() {
  const [view, setView] = useState<View>('list');
  const [loadedDocId, setLoadedDocId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function goToList() {
    setView('list');
    setLoadedDocId(null);
    // Bump refreshKey para que la lista recargue al volver.
    setRefreshKey(k => k + 1);
  }

  function openNew() {
    setLoadedDocId(null);
    setView('editor');
  }

  function openExisting(id: string) {
    setLoadedDocId(id);
    setView('editor');
  }

  if (view === 'editor') {
    return (
      <MealPlanGenerator
        loadedDocId={loadedDocId}
        onBackToList={goToList}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <GeneratedDocsList
      type="meal_plan"
      sectionTitle="Generador de Planes"
      sectionDescription="Historial de planes nutricionales generados. Al crear uno nuevo se guarda automáticamente para que puedas reabrirlo, editarlo o reimprimirlo más tarde."
      newButtonLabel="Nuevo plan"
      onCreateNew={openNew}
      onOpen={openExisting}
      refreshKey={refreshKey}
    />
  );
}
