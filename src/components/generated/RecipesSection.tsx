/**
 * Wrapper de la sección "Recetario".
 * Por default muestra el historial; con el botón "Nuevo recetario"
 * abre el generador. Al guardarse uno nuevo se refresca el historial.
 */

import { useState } from 'react';
import GeneratedDocsList from './GeneratedDocsList';
import RecipeGenerator from '../RecipeGenerator';

type View = 'list' | 'editor';

export default function RecipesSection() {
  const [view, setView] = useState<View>('list');
  const [loadedDocId, setLoadedDocId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function goToList() {
    setView('list');
    setLoadedDocId(null);
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
      <RecipeGenerator
        loadedDocId={loadedDocId}
        onBackToList={goToList}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <GeneratedDocsList
      type="recipes"
      sectionTitle="Recetario"
      sectionDescription="Historial de recetarios generados. Al crear uno nuevo se guarda automáticamente para reabrirlo, editarlo o reimprimirlo cuando lo necesites."
      newButtonLabel="Nuevo recetario"
      onCreateNew={openNew}
      onOpen={openExisting}
      refreshKey={refreshKey}
    />
  );
}
