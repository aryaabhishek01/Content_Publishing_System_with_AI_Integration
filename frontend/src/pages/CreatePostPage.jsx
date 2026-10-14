import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Image, Video, Wand2, Search, Plus, X, AlertTriangle
} from 'lucide-react';
import { postApi, aiApi } from '../api';

const MOODS = [
  { id: 'HAPPY', label: '😊 Happy' },
  { id: 'SAD', label: '😢 Sad' },
  { id: 'POLITICS', label: '🏛️ Politics' },
  { id: 'SPORTS', label: '⚽ Sports' },
  { id: 'CRICKET', label: '🏏 Cricket' },
  { id: 'TRAVEL', label: '✈️ Travel' },
  { id: 'FOOD', label: '🍽️ Food' },
  { id: 'MUSIC', label: '🎵 Music' },
  { id: 'ART', label: '🎨 Art' },
  { id: 'TECHNOLOGY', label: '💻 Tech' },
  { id: 'OTHER', label: '🌟 Other' },
];

export default function CreatePostPage() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('PHOTO');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState('HAPPY');
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showOther, setShowOther] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [spellingWarnings, setSpellingWarnings] = useState({});

  useEffect(() => {
    postApi.getCategories().then(r => setAllCategories(r.data)).catch(() => {});
  }, []);

  const filteredCategories = categorySearch
    ? allCategories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    : allCategories;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'VIDEO' : 'PHOTO');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'VIDEO' : 'PHOTO');
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const toggleCategory = (cat) => {
    if (cat.name === 'Other') {
      setShowOther(!showOther);
      return;
    }
    setSelectedCategories(p =>
      p.find(c => c.id === cat.id)
        ? p.filter(c => c.id !== cat.id)
        : [...p, cat]
    );
  };

  const handleAiDescription = async () => {
    setAiLoading(true);
    try {
      const { data } = await aiApi.generateDescription({
        mood,
        categories: selectedCategories.map(c => c.name),
        mediaType,
        userText: description.trim() || undefined, // continue from typed text if any
      });
      setDescription(data.suggested);
      toast.success(description.trim() ? '✨ AI continued your description!' : '✨ AI description generated!');
    } catch {
      toast.error('AI service unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDescriptionChange = async (e) => {
    const text = e.target.value;
    setDescription(text);
    // Debounced spell check
    if (text.length > 5) {
      try {
        const { data } = await aiApi.spellCheck(text);
        setSpellingWarnings(data.suggestions || {});
      } catch {}
    } else {
      setSpellingWarnings({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Description cannot be empty'); return; }
    if (selectedCategories.length === 0 && !customCategory.trim()) {
      toast.error('Please select at least one category');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('description', description);
      fd.append('mood', mood);
      fd.append('mediaType', mediaType);
      selectedCategories.forEach(c => fd.append('categories', c.name));
      if (customCategory.trim()) fd.append('customCategory', customCategory.trim());
      if (mediaFile) fd.append('mediaFile', mediaFile);

      await postApi.create(fd);
      toast.success('Post published! 🎉');
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, fontFamily: 'Outfit' }}>
        Create Post
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Media Upload */}
        <div className="create-post-card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>📎 Media</h3>
          {!mediaPreview ? (
            <div
              className="media-upload-area"
              onClick={() => fileRef.current.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <Upload size={32} color="var(--accent-secondary)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                Drop a photo or video here, or click to browse
              </p>
              <div className="flex gap-2 justify-center">
                <span className="badge badge-purple"><Image size={12} /> Photo</span>
                <span className="badge badge-blue"><Video size={12} /> Video</span>
              </div>
            </div>
          ) : (
            <div className="media-preview">
              {mediaType === 'VIDEO'
                ? <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'cover' }} />
                : <img src={mediaPreview} alt="preview" style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'cover' }} />
              }
              <button
                type="button"
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="white" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFileChange} />
        </div>

        {/* Mood */}
        <div className="create-post-card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>🎭 Mood</h3>
          <div className="mood-grid">
            {MOODS.map(m => (
              <div
                key={m.id}
                className={`mood-chip ${mood === m.id ? 'selected' : ''}`}
                onClick={() => setMood(m.id)}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="create-post-card">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>🏷️ Categories</h3>
          <div className="search-input-container" style={{ marginBottom: 12 }}>
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
            />
          </div>
          <div className="category-chips">
            {filteredCategories.map(c => (
              <span
                key={c.id}
                className={`category-chip ${selectedCategories.find(sc => sc.id === c.id) ? 'selected' : ''}`}
                onClick={() => toggleCategory(c)}
              >
                {c.name}
              </span>
            ))}
            <span
              className={`category-chip ${showOther ? 'selected' : ''}`}
              onClick={() => setShowOther(!showOther)}
            >
              <Plus size={12} /> Other
            </span>
          </div>
          {showOther && (
            <div className="input-group" style={{ marginTop: 12 }}>
              <label className="input-label">Custom Category</label>
              <input
                className="input"
                placeholder="Type your category..."
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
              />
            </div>
          )}
          {selectedCategories.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              Selected: {selectedCategories.map(c => c.name).join(', ')}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="create-post-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>📝 Description</h3>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={handleAiDescription}
              disabled={aiLoading}
            >
              {aiLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Wand2 size={14} />}
              {description.trim() ? 'Continue with AI' : 'AI Suggest'}
            </button>
          </div>
          <textarea
            className="input"
            rows={5}
            placeholder="Write a description... (or use AI Suggest)"
            value={description}
            onChange={handleDescriptionChange}
            style={{ resize: 'vertical', borderRadius: 12 }}
          />

          {/* Spelling warnings */}
          {Object.keys(spellingWarnings).length > 0 && (
            <div className="spell-suggestion">
              <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              <strong>Spelling suggestions:</strong>{' '}
              {Object.entries(spellingWarnings).map(([word, sug]) => (
                <span key={word} style={{ marginRight: 12 }}>
                  "{word}" → <span style={{ color: 'var(--accent-green)', cursor: 'pointer' }}
                    onClick={() => setDescription(d => d.replace(new RegExp(word, 'g'), sug[0]))}>
                    {sug[0]}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          style={{ padding: '14px 24px', fontSize: 16, marginBottom: 48 }}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : '🚀 Publish Post'}
        </button>
      </form>
    </div>
  );
}
