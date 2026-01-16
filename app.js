const { useState, useMemo } = React;
const {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} = Recharts;
const Papa = window.Papa;

const RegistrarDashboard = () => {
  const [data, setData] = useState([]);
  const [selectedRegistrar, setSelectedRegistrar] = useState('');
  const [tld, setTld] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
      error: (error) => console.error('Erreur de parsing:', error)
    });
  };

  const ovhData = useMemo(() => {
    const ovhVariants = data.filter(r => r.registrar.toLowerCase().includes('ovh'));
    return ovhVariants.reduce((acc, curr) => ({
      registrar: 'OVH (Total)',
      stock: acc.stock + curr.stock,
      creations: acc.creations + curr.creations
    }), { registrar: 'OVH (Total)', stock: 0, creations: 0 });
  }, [data]);

  const registrarsList = useMemo(() => {
    return data.filter(r => !r.registrar.toLowerCase().includes('ovh'))
               .sort((a, b) => b.stock - a.stock);
  }, [data]);

  const selectedData = useMemo(() => data.find(r => r.registrar === selectedRegistrar) || { stock: 0, creations: 0 }, [data, selectedRegistrar]);
  const totalStock = useMemo(() => data.reduce((sum, r) => sum + r.stock, 0), [data]);
  const totalCreations = useMemo(() => data.reduce((sum, r) => sum + r.creations, 0), [data]);

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
      { metric: 'Créations', OVH: ovhData.creations, [selectedRegistrar]: selectedData.creations },
      { metric: 'Stock', OVH: ovhData.stock, [selectedRegistrar]: selectedData.stock }
    ];
  }, [ovhData, selectedData, selectedRegistrar]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num);

  if (data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard Registrars .{tld || 'BE'}</h1>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="border p-2 rounded"/>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard Registrars .{tld}</h1>

      <select
        className="mb-6 p-2 border rounded"
        value={selectedRegistrar}
        onChange={(e) => setSelectedRegistrar(e.target.value)}
      >
        <option value="">-- Choisir un registrar --</option>
        {registrarsList.map(r => (
          <option key={r.registrar} value={r.registrar}>{r.registrar}</option>
        ))}
      </select>

      {selectedRegistrar && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Comparaison Créations / Stock</h2>
            <ResponsiveContainer width="100%" height={300}>
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

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Part de marché des créations</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [
                  `${value.toFixed(2)}% (${formatNumber(props.payload.absolute)})`, name
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Part de marché du stock</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockShareData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {stockShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [
                  `${value.toFixed(2)}% (${formatNumber(props.payload.absolute)})`, name
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RegistrarDashboard />);
