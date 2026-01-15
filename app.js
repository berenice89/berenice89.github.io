import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const RegistrarDashboard = () => {
  const [csvData, setCsvData] = useState([]);
  const [selectedRegistrars, setSelectedRegistrars] = useState([]);
  const [startPeriod, setStartPeriod] = useState({ month: 1, year: 2025 });
  const [endPeriod, setEndPeriod] = useState({ month: 12, year: 2025 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const GITHUB_REPO = 'https://raw.githubusercontent.com/berenice89/database-afnic/main/';

  const loadCSVFromGitHub = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // Essayer de charger les fichiers csv1, csv2, csv3, etc.
      const maxFiles = 12; // Essayer jusqu'à 12 fichiers (1 an)
      const promises = [];
      
      for (let i = 1; i <= maxFiles; i++) {
        const url = `${GITHUB_REPO}csv${i}.csv`;
        console.log(`Tentative de chargement: ${url}`);
        promises.push(
          fetch(url)
            .then(response => {
              console.log(`Réponse pour csv${i}.csv:`, response.status, response.statusText);
              if (!response.ok) throw new Error(`File csv${i}.csv not found (${response.status})`);
              return response.text();
            })
            .then(text => {
              console.log(`csv${i}.csv chargé, taille:`, text.length);
              return { fileNumber: i, text };
            })
            .catch(error => {
              console.log(`csv${i}.csv non trouvé:`, error.message);
              return null;
            })
        );
      }
      
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);
      
      console.log(`${validResults.length} fichiers valides trouvés sur ${maxFiles} tentatives`);
      
      if (validResults.length === 0) {
        throw new Error('Aucun fichier CSV trouvé. Vérifiez que csv1.csv et csv2.csv sont bien dans votre repository GitHub à la racine (branche main).');
      }
      
      const parsedFiles = validResults.map(({ fileNumber, text }) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimitersToGuess: ['\t', ';', ',', '|']
        });
        
        const month = fileNumber;
        const date = new Date(Date.UTC(2025, month - 1, 1));
        
        console.log(`csv${fileNumber}.csv parsé: ${parsed.data.length} lignes`);
        
        return {
          month,
          date: date.toISOString().slice(0, 10),
          data: parsed.data
        };
      });
      
      const sorted = parsedFiles.sort((a, b) => a.month - b.month);
      setCsvData(sorted);
      console.log(`${sorted.length} fichiers chargés avec succès depuis GitHub`);
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger automatiquement au démarrage
  React.useEffect(() => {
    loadCSVFromGitHub();
  }, []);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    console.log('Fichiers sélectionnés:', files.length);
    
    if (files.length === 0) return;
    
    Promise.all(
      files.map(file => {
        return new Promise((resolve, reject) => {
          console.log('Traitement du fichier:', file.name);
          const fileNumber = file.name.match(/csv(\d+)/)?.[1] || file.name.match(/(\d+)/)?.[1];
          
          if (!fileNumber) {
            console.warn('Impossible de trouver le numéro dans:', file.name);
            resolve(null);
            return;
          }
          
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: ['\t', ';', ',', '|'],
            complete: (results) => {
              console.log('Parsing terminé pour', file.name, ':', results.data);
              console.log('Headers détectés:', results.meta.fields);
              console.log('Délimiteur détecté:', results.meta.delimiter);
              const month = parseInt(fileNumber);
              // csv1 = 1er janvier 2025, csv2 = 1er février 2025
              // Utiliser UTC pour éviter les problèmes de fuseau horaire
              const date = new Date(Date.UTC(2025, month - 1, 1));
              console.log('Date calculée:', date, 'pour mois', month);
              resolve({
                month,
                date: date.toISOString().slice(0, 10),
                data: results.data
              });
            },
            error: (error) => {
              console.error('Erreur parsing:', error);
              reject(error);
            }
          });
        });
      })
    ).then(parsedFiles => {
      const validFiles = parsedFiles.filter(f => f !== null);
      console.log('Fichiers valides parsés:', validFiles.length);
      
      const sorted = validFiles.sort((a, b) => a.month - b.month);
      setCsvData(prev => {
        const combined = [...prev, ...sorted];
        const unique = combined.filter((item, index, self) =>
          index === self.findIndex(t => t.month === item.month)
        );
        return unique.sort((a, b) => a.month - b.month);
      });
    }).catch(error => {
      console.error('Erreur lors du traitement des fichiers:', error);
    });
  };

  const allRegistrars = useMemo(() => {
    if (csvData.length === 0) return [];
    const registrars = new Set();
    csvData.forEach(monthData => {
      monthData.data.forEach(row => {
        // La colonne 1 s'appelle "BE" et contient le nom du registrar
        if (row.BE) registrars.add(row.BE.trim());
      });
    });
    return Array.from(registrars).sort();
  }, [csvData]);

  const filteredRegistrars = useMemo(() => {
    if (!searchQuery) return allRegistrars;
    const query = searchQuery.toLowerCase();
    return allRegistrars.filter(reg => reg.toLowerCase().includes(query));
  }, [allRegistrars, searchQuery]);

  const processedData = useMemo(() => {
    console.log('ProcessedData appelé, csvData:', csvData.length);
    if (csvData.length === 0) return { chartData: [], tableData: [] };

    const startDate = new Date(startPeriod.year, startPeriod.month - 1);
    const endDate = new Date(endPeriod.year, endPeriod.month - 1);

    const filteredData = csvData.filter(monthData => {
      const date = new Date(monthData.date);
      return date >= startDate && date <= endDate;
    });

    console.log('Données filtrées:', filteredData.length, 'sur', csvData.length);
    console.log('Registrars sélectionnés:', selectedRegistrars);

    const chartData = filteredData.map(monthData => {
      const dataPoint = {
        date: new Date(monthData.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        rawDate: monthData.date
      };

      monthData.data.forEach(row => {
        // Colonne 1 = BE (registrar), Colonne 3 = nombre de creations 1 an, Colonne 4 = nombre de creations 2 ans
        const registrar = row.BE?.trim();
        if (registrar && selectedRegistrars.includes(registrar)) {
          const creation1 = parseFloat(row['nombre de creations 1 an']?.toString().replace(',', '.')) || 0;
          const creation2 = parseFloat(row['nombre de creations 2 ans']?.toString().replace(',', '.')) || 0;
          dataPoint[registrar] = creation1 + creation2;
        }
      });

      return dataPoint;
    });

    console.log('Données pour le graphique:', chartData);

    const tableData = filteredData.map(monthData => {
      const row = {
        date: new Date(monthData.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      };

      let totalCreations = 0;
      const registrarTotals = {};

      monthData.data.forEach(dataRow => {
        const registrar = dataRow.Registrar?.trim();
        if (registrar) {
          const creation1 = parseFloat(dataRow['création 1 an']?.replace(',', '.')) || 0;
          const creation2 = parseFloat(dataRow['création 2 ans']?.replace(',', '.')) || 0;
          const total = creation1 + creation2;
          registrarTotals[registrar] = total;
          totalCreations += total;
        }
      });

      selectedRegistrars.forEach(registrar => {
        const total = registrarTotals[registrar] || 0;
        const marketShare = totalCreations > 0 ? ((total / totalCreations) * 100).toFixed(2) : '0.00';
        row[`${registrar}_volume`] = total.toLocaleString('fr-FR');
        row[`${registrar}_share`] = `${marketShare}%`;
      });

      return row;
    });

    return { chartData, tableData };
  }, [csvData, selectedRegistrars, startPeriod, endPeriod]);

  const handleRegistrarToggle = (registrar) => {
    setSelectedRegistrars(prev => {
      if (prev.includes(registrar)) {
        return prev.filter(r => r !== registrar);
      } else if (prev.length < 2) {
        return [...prev, registrar];
      } else {
        return [prev[1], registrar];
      }
    });
  };

  const colors = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Registrars</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Chargement des données</h2>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Chargement des fichiers CSV depuis GitHub...</span>
            </div>
          )}
          
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 font-semibold">Erreur de chargement</p>
              <p className="text-red-600 text-sm mt-1">{loadError}</p>
              <button
                onClick={loadCSVFromGitHub}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}
          
          {!isLoading && !loadError && csvData.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-2">
                ✓ {csvData.length} fichier(s) chargé(s) depuis GitHub
              </p>
              <div className="text-xs text-gray-500">
                <p className="font-medium mb-1">Mois disponibles :</p>
                <div className="flex flex-wrap gap-2">
                  {csvData.map(data => (
                    <span key={data.month} className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      {new Date(data.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} ({data.data.length} registrars)
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={loadCSVFromGitHub}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                🔄 Recharger les données
              </button>
            </div>
          )}
        </div>

        {csvData.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filtres</h2>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  ✓ Filtres appliqués automatiquement
                </span>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner 2 registrars à comparer {selectedRegistrars.length > 0 && `(${selectedRegistrars.length}/2 sélectionnés)`}
                </label>
                
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Rechercher un registrar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredRegistrars.length} registrar(s) trouvé(s)
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-md">
                  {filteredRegistrars.map(registrar => (
                    <button
                      key={registrar}
                      onClick={() => handleRegistrarToggle(registrar)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedRegistrars.includes(registrar)
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } ${!selectedRegistrars.includes(registrar) && selectedRegistrars.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!selectedRegistrars.includes(registrar) && selectedRegistrars.length >= 2}
                    >
                      {selectedRegistrars.includes(registrar) && '✓ '}
                      {registrar}
                    </button>
                  ))}
                  {filteredRegistrars.length === 0 && (
                    <p className="text-sm text-gray-500 w-full text-center py-4">
                      Aucun registrar trouvé pour "{searchQuery}"
                    </p>
                  )}
                </div>
                {selectedRegistrars.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">⚠️ Sélectionnez au moins un registrar pour afficher les données</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Période de début</label>
                  <div className="flex gap-2">
                    <select
                      value={startPeriod.month}
                      onChange={(e) => setStartPeriod(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2025, i, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={startPeriod.year}
                      onChange={(e) => setStartPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Période de fin</label>
                  <div className="flex gap-2">
                    <select
                      value={endPeriod.month}
                      onChange={(e) => setEndPeriod(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2025, i, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={endPeriod.year}
                      onChange={(e) => setEndPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {selectedRegistrars.length > 0 && (
              <>
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Évolution des créations</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={processedData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString('fr-FR')} />
                      <Legend />
                      {selectedRegistrars.map((registrar, index) => (
                        <Line
                          key={registrar}
                          type="monotone"
                          dataKey={registrar}
                          stroke={colors[index]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RegistrarDashboard;