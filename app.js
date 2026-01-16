import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const RegistrarDashboard = () => {
  const [data, setData] = useState([]);
  const [selectedRegistrar, setSelectedRegistrar] = useState('');
  const [tld, setTld] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map(row => ({
            registrar: row[Object.keys(row)[0]]?.trim() || '',
            stock: parseInt(row[Object.keys(row)[1]]) || 0,
            creations: parseInt(row[Object.keys(row)[2]]) || 0
          })).filter(row => row.registrar && row.registrar !== 'BE');
          
          setData(parsedData);
          if (parsedData.length > 0 && parsedData[0].registrar) {
            setTld(results.data[0][Object.keys(results.data[0])[0]] || 'BE');
          }
        },
        error: (error) => {
          console.error('Erreur de parsing:', error);
        }
      });
    }
  };

  const ovhData = useMemo(() => {
    const ovhVariants = data.filter(r => 
      r.registrar.toLowerCase().includes('ovh') || 
      r.registrar.toLowerCase().includes('ovhcloud')
    );
    
    return ovhVariants.reduce((acc, curr) => ({
      registrar: 'OVH (Total)',
      stock: acc.stock + curr.stock,
      creations: acc.creations + curr.creations
    }), { registrar: 'OVH (Total)', stock: 0, creations: 0 });
  }, [data]);

  const registrarsList = useMemo(() => {
    return data
      .filter(r => !r.registrar.toLowerCase().includes('ovh'))
      .sort((a, b) => b.stock - a.stock);
  }, [data]);

  const selectedData = useMemo(() => {
    return data.find(r => r.registrar === selectedRegistrar) || { stock: 0, creations: 0 };
  }, [data, selectedRegistrar]);

  const totalStock = useMemo(() => {
    return data.reduce((sum, r) => sum + r.stock, 0);
  }, [data]);

  const totalCreations = useMemo(() => {
    return data.reduce((sum, r) => sum + r.creations, 0);
  }, [data]);

  const marketShareData = useMemo(() => {
    if (!selectedRegistrar) return [];
    
    const ovhShare = (ovhData.creations / totalCreations) * 100;
    const selectedShare = (selectedData.creations / totalCreations) * 100;
    const othersShare = 100 - ovhShare - selectedShare;
    
    return [
      { name: 'OVH', value: ovhShare, absolute: ovhData.creations },
      { name: selectedRegistrar, value: selectedShare, absolute: selectedData.creations },
      { name: 'Autres', value: othersShare, absolute: totalCreations - ovhData.creations - selectedData.creations }
    ].filter(item => item.value > 0);
  }, [ovhData, selectedData, selectedRegistrar, totalCreations]);

  const stockShareData = useMemo(() => {
    if (!selectedRegistrar) return [];
    
    const ovhShare = (ovhData.stock / totalStock) * 100;
    const selectedShare = (selectedData.stock / totalStock) * 100;
    const othersShare = 100 - ovhShare - selectedShare;
    
    return [
      { name: 'OVH', value: ovhShare, absolute: ovhData.stock },
      { name: selectedRegistrar, value: selectedShare, absolute: selectedData.stock },
      { name: 'Autres', value: othersShare, absolute: totalStock - ovhData.stock - selectedData.stock }
    ].filter(item => item.value > 0);
  }, [ovhData, selectedData, selectedRegistrar, totalStock]);

  const comparisonData = useMemo(() => {
    if (!selectedRegistrar) return [];
    
    return [
      { 
        metric: 'Créations',
        OVH: ovhData.creations,
        [selectedRegistrar]: selectedData.creations
      },
      { 
        metric: 'Stock',
        OVH: ovhData.stock,
        [selectedRegistrar]: selectedData.stock
      }
    ];
  }, [ovhData, selectedData, selectedRegistrar]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Dashboard Registrars .{tld || 'BE'}
            </h1>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-indigo-500 transition-colors">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-indigo-600 font-semibold hover:text-indigo-500">
                  Choisir un fichier CSV
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Format attendu : Registrar, Stock, Créations
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Dashboard Registrars .{tld}
              </h1>
              <p className="text-gray-600 mt-1">Analyse comparative du marché</p>
            </div>
            
            <div className="w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner un registrar à comparer avec OVH
              </label>
              <select
                value={selectedRegistrar}
                onChange={(e) => setSelectedRegistrar(e.target.value)}
                className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- Choisir un registrar --</option>
                {registrarsList.map(r => (
                  <option key={r.registrar} value={r.registrar}>
                    {r.registrar} ({formatNumber(r.stock)} domaines)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedRegistrar && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Créations OVH</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">
                      {formatNumber(ovhData.creations)}
                    </p>
                  </div>
                  <div className="bg-indigo-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Créations {selectedRegistrar.substring(0, 20)}</p>
                    <p className="text-3xl font-bold text-teal-600 mt-2">
                      {formatNumber(selectedData.creations)}
                    </p>
                  </div>
                  <div className="bg-teal-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stock OVH</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {formatNumber(ovhData.stock)}
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stock {selectedRegistrar.substring(0, 20)}</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">
                      {formatNumber(selectedData.stock)}
                    </p>
                  </div>
                  <div className="bg-amber-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Part de marché des créations
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={marketShareData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {marketShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [
                      `${value.toFixed(2)}% (${formatNumber(props.payload.absolute)} créations)`,
                      name
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Part de marché du stock
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stockShareData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stockShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [
                      `${value.toFixed(2)}% (${formatNumber(props.payload.absolute)} domaines)`,
                      name
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Comparaison directe
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />
                  <Bar dataKey="OVH" fill="#0088FE" />
                  <Bar dataKey={selectedRegistrar} fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegistrarDashboard;
