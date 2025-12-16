import { useState, useEffect } from 'react';
import { wordSetsAPI } from '../../services/api';
import { Plus, Trash2, Edit2, X, Save, FileText, Home } from 'lucide-react';

export function WordSetManager({ onNavigate }) {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    wordsText: ''
  });

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      setLoading(true);
      const data = await wordSetsAPI.list();
      setSets(data);
    } catch (err) {
      setError('Failed to load word sets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Parse words from text area (split by commas, newlines, or spaces)
      const words = formData.wordsText
        .split(/[\n,]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

      if (words.length === 0) {
        alert('Please enter at least one word');
        return;
      }

      if (formData.id) {
        // Update
        await wordSetsAPI.update(formData.id, formData.name, formData.description, words);
      } else {
        // Create
        await wordSetsAPI.create(formData.name, formData.description, words);
      }

      setShowForm(false);
      setFormData({ id: null, name: '', description: '', wordsText: '' });
      loadSets();
    } catch (err) {
      console.error(err);
      alert('Failed to save word set: ' + err.message);
    }
  };

  const handleEdit = (set) => {
    setFormData({
      id: set.id,
      name: set.name,
      description: set.description || '',
      wordsText: set.words.join(', ')
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this word set?')) return;
    try {
      await wordSetsAPI.delete(id);
      loadSets();
    } catch (err) {
      console.error(err);
      alert('Failed to delete word set');
    }
  };

  if (loading && !sets.length) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate && onNavigate('home')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors hover:bg-[var(--bg-input)]"
            style={{ color: 'var(--text-dim)' }}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Word Sets</h2>
        </div>
        <button
          onClick={() => {
            setFormData({ id: null, name: '', description: '', wordsText: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 shadow-lg"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
          }}
        >
          <Plus className="w-5 h-5" />
          Create New Set
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-[var(--status-error)] bg-opacity-10 text-[var(--status-error)] border border-[var(--status-error)]">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                {formData.id ? 'Edit Word Set' : 'Create New Word Set'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-full transition-colors">
                <X className="w-6 h-6" style={{ color: 'var(--text-dim)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dim)' }}>Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-transparent focus:border-[var(--accent-primary)] outline-none transition-colors"
                  style={{ color: 'var(--text-main)' }}
                  placeholder="e.g. English Top 200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dim)' }}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-transparent focus:border-[var(--accent-primary)] outline-none transition-colors"
                  style={{ color: 'var(--text-main)' }}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dim)' }}>Words</label>
                <textarea
                  required
                  value={formData.wordsText}
                  onChange={e => setFormData({...formData, wordsText: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-transparent focus:border-[var(--accent-primary)] outline-none transition-colors min-h-[150px] font-mono text-sm"
                  style={{ color: 'var(--text-main)' }}
                  placeholder="Paste words here (separated by spaces, commas, or new lines)..."
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  Word count: {formData.wordsText.split(/[\n,]+/).filter(w => w.trim().length > 0).length}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg font-medium hover:bg-[var(--bg-input)] transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg font-medium shadow-lg transition-transform active:scale-95"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  Save Word Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map(set => (
          <div key={set.id} className="glass-panel p-6 rounded-xl hover:border-[var(--accent-primary)] transition-colors group relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>{set.name}</h3>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{set.description || 'No description'}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(set)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-dim)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(set.id)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-dim)] hover:text-[var(--status-error)] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              <FileText className="w-4 h-4" />
              <span>{set.words.length} words</span>
            </div>
            
            {/* Preview of first few words */}
            <div className="mt-4 pt-4 border-t border-[var(--bg-input)]">
              <p className="text-xs font-mono truncate opacity-60" style={{ color: 'var(--text-main)' }}>
                {set.words.slice(0, 10).join(', ')}{set.words.length > 10 ? '...' : ''}
              </p>
            </div>
          </div>
        ))}
        
        {sets.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 glass-panel rounded-xl border-dashed border-2" style={{ borderColor: 'var(--text-dim)' }}>
            <p style={{ color: 'var(--text-dim)' }}>No word sets created yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-sm font-medium underline hover:text-[var(--accent-primary)] transition-colors"
              style={{ color: 'var(--text-main)' }}
            >
              Create your first set
            </button>
          </div>
        )}
      </div>
    </div>
  );
}