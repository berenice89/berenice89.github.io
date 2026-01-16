const { useState } = React;
const {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} = Recharts;
const Papa = window.Papa;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const RegistrarDashboard = () => {
  const [data, setData] = useState([]);
  const [selectedRegistrar, setSelectedRegistrar] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map(row => ({
          registrar: row[Object.keys(row)[0]]?.trim() || '',
          stock: parseInt(row[Object.keys(row)[1]]) || 0,
          creations: parseInt(row[Object.keys(row)[2]]) || 0
        })).filter(r => r.registrar);

        setData(parsed);
      }
    });
  };

  if (data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard Registrars</h1>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="border p-2 rounded"/>
        </div>
      </div>
    );
  }

  const ovhData = data.filter(r => r.registrar.toLowerCase().includes('ovh'))
                      .reduce((acc, r) => ({
                        registrar: 'OVH',
                        stock: acc.stock + r.stock,
                        creations: acc.creations + r.creations
                      }), { registrar: 'OVH', stock:0, creations:0 });

  const selectedData = data.find(r => r.registrar === selectedRegistrar) || { stock:0, creations:0 };

  const totalStock = data.reduce((sum,r) => sum + r.stock,0);
  const totalCreations = data.reduce((sum,r) => sum + r.creations,0);

  const marketShareData = selectedRegistrar ? [
    { name:'OVH', value: ovhData.creations },
    { name:selectedRegistrar, value: selectedData.creations },
    { name:'Autres', value: totalCreations - ovhData.creations - selectedData.creations }
  ] : [];

  const comparisonData = selectedRegistrar ? [
    { metric:'Créations', OVH: ovhData.creations, [selectedRegistrar]: selectedData.creations },
    { metric:'Stock', OVH: ovhData.stock, [selectedRegistrar]: selectedData.stock }
  ] : [];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard Registrars</h1>

      <select
        className="mb-6 p-2 border rounded"
        value={selectedRegistrar}
        onChange={e => setSelectedRegistrar(e.target.value)}
      >
        <option value="">-- Choisir un registrar --</option>
        {data.filter(r => !r.registrar.toLowerCase().includes('ovh')).map(r => (
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
                <Tooltip />
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
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
