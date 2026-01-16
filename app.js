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
      r.registrar.toLowerCase().includes('ovh')
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold mb-6">Dashboard Registrars .{tld || 'BE'}</h1>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Registrars .{tld}</h1>

      <select
        className="mb-6 p-2 border rounded"
        value={selectedRegistrar}
        onChange={(e) => setSelectedRegistrar(e.target.value)}
      >
        <option value="">-- Choisir un registrar --</option>
        {registrarsList.map(r => (
          <option key={r.registrar} value={r.registrar}>
            {r.registrar}
          </option>
        ))}
      </select>

      {selectedRegistrar && (
        <ResponsiveContainer width="100%" height={4
