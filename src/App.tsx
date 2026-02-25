/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import Metrics from './components/Metrics';
import Charts from './components/Charts';
import EmployeesTable from './components/EmployeesTable';
import SessionForm from './components/SessionForm';
import Parameters from './components/Parameters';
import Footer from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans overflow-x-hidden">
      <Header />
      
      <main className="max-w-[1600px] mx-auto p-8">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'dashboard' && (
          <>
            <Metrics />
            <Charts />
            <EmployeesTable />
          </>
        )}

        {activeTab === 'empleados' && (
          <EmployeesTable />
        )}

        {activeTab === 'nueva-sesion' && (
          <SessionForm />
        )}

        {activeTab === 'parametros' && (
          <Parameters />
        )}
      </main>

      <Footer />
    </div>
  );
}

