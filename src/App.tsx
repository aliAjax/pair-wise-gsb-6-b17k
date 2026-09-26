import {useEffect, useState} from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Grid3X3,
  Heart,
  ListPlus,
  Plus,
  Settings2,
  SlidersHorizontal,
  Star,
  Trash2,
  Type,
} from 'lucide-react';
import {FONTS, PURPOSE_SUGGESTIONS, SEED_PAIRS, type Pair} from './data/library';
import type {FontSpec, Shortlist} from './domain/types';
import {
  confirmRevision,
  confirmShortlist,
  createShortlist,
  currentChoice,
  discardRevision,
  pickFromLibrary,
  proposeParamChange,
  rejectWithSubstitute,
  type Result,
} from './domain/shortlist';
import {loadShortlist, saveShortlist} from './storage/archive';
import {ShortlistPanel} from './ui/ShortlistPanel';

export default function App() {
  const [pairs, setPairs] = useState<Pair[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('type-pairs') || '') || SEED_PAIRS;
    } catch {
      return SEED_PAIRS;
    }
  });
  const [selected, setSelected] = useState(1);
  const [headingFont, setHeadingFont] = useState('Fraunces');
  const [bodyFont, setBodyFont] = useState('DM Sans');
  const [size, setSize] = useState(46);
  const [weight, setWeight] = useState(600);
  const [leading, setLeading] = useState(1.25);
  const [tracking, setTracking] = useState(0);
  const [purpose, setPurpose] = useState(PURPOSE_SUGGESTIONS[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [shortlist, setShortlist] = useState<Shortlist | null>(() => loadShortlist());
  const [notice, setNotice] = useState('');

  const current = pairs.find(p => p.id === selected) || pairs[0];

  useEffect(() => localStorage.setItem('type-pairs', JSON.stringify(pairs)), [pairs]);
  useEffect(() => saveShortlist(shortlist), [shortlist]);

  const nowIso = () => new Date().toISOString();

  const applyResult = (r: Result) => {
    if (r.ok) {
      setShortlist(r.list);
      setNotice('');
    } else {
      setNotice(r.reason);
    }
  };

  // 挑中那一刻：把画布当前的字体、字号、行高连同用途记成快照
  const snapshotSpec = (usePurpose: string): FontSpec => ({
    headingFont,
    bodyFont,
    headingSizePx: size,
    lineHeight: leading,
    purpose: usePurpose.trim() || '未注明用途',
  });

  const create = () => {
    if (!newTitle.trim()) return;
    const id = Date.now();
    setPairs(ps => [
      ...ps,
      {
        id,
        title: newTitle.trim(),
        heading: 'Your new headline',
        body: 'Start with a sentence that lets your type pairing show its character.',
        category: 'Untitled',
        favorite: false,
      },
    ]);
    setSelected(id);
    setNewTitle('');
    setShowAdd(false);
  };

  const toggleFav = () =>
    setPairs(ps => ps.map(p => (p.id === selected ? {...p, favorite: !p.favorite} : p)));

  const addToShortlist = () => {
    const list =
      shortlist ??
      createShortlist(`客户选样 ${new Date().toISOString().slice(0, 10)}`, nowIso());
    applyResult(
      pickFromLibrary(list, {id: current.id, title: current.title}, snapshotSpec(purpose), nowIso()),
    );
  };

  const handleSubstitute = (slotId: string, pairId: number) => {
    if (!shortlist) return;
    const pair = pairs.find(p => p.id === pairId);
    const slot = shortlist.slots.find(s => s.id === slotId);
    if (!pair || !slot) return;
    applyResult(
      rejectWithSubstitute(
        shortlist,
        slotId,
        {id: pair.id, title: pair.title},
        snapshotSpec(currentChoice(slot).spec.purpose),
        nowIso(),
      ),
    );
  };

  const handleProposeParams = (slotId: string, spec: FontSpec) => {
    if (!shortlist) return;
    applyResult(proposeParamChange(shortlist, slotId, spec, nowIso()));
  };

  const exportCss = () => {
    const css = `/* ${current.title} */
.heading { font-family: '${headingFont}'; font-size: ${size}px; font-weight: ${weight}; }
.body { font-family: '${bodyFont}'; line-height: ${leading}; letter-spacing: ${tracking}px; }`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([css], {type: 'text/css'}));
    a.download = 'type-pair.css';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-mark"><Type size={18} /></div>
          <div>
            <b>Type Pairer</b>
            <small>FIND YOUR VOICE</small>
          </div>
        </div>
        <div className="nav-section">
          <span>LIBRARY</span>
          <button className="nav active"><Grid3X3 size={16} />All pairings <b>{pairs.length}</b></button>
          <button className="nav"><Heart size={16} />Favorites <b>{pairs.filter(p => p.favorite).length}</b></button>
        </div>
        <div className="saved">
          <div className="saved-head">
            <span>COLLECTIONS</span>
            <button onClick={() => setShowAdd(true)}><Plus size={14} /></button>
          </div>
          <button className="collection"><i style={{background: '#e8b7a0'}} />Editorial <b>4</b></button>
          <button className="collection"><i style={{background: '#9fc9be'}} />Portfolio <b>3</b></button>
          <button className="collection"><i style={{background: '#b4add8'}} />Brand voice <b>5</b></button>
        </div>
        <div className="aside-foot">
          <button className="nav"><Settings2 size={16} />Preferences</button>
          <div className="profile">
            <div className="avatar">YL</div>
            <div>
              <b>Yuki Lin</b>
              <small>Design workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">TYPE LIBRARY / <b>PAIRING STUDIO</b></div>
            <h1>Find the right conversation.</h1>
            <p>Explore combinations, tune the details, and save what feels like you.</p>
          </div>
          <div className="actions">
            <button className="outline" onClick={exportCss}><Download size={15} />Copy CSS</button>
            <button className="primary" onClick={() => setShowAdd(true)}><Plus size={16} />New pairing</button>
          </div>
        </header>

        <div className="layout">
          <section className="gallery">
            <div className="gallery-head">
              <div>
                <h2>Saved pairings</h2>
                <span>{pairs.length} compositions</span>
              </div>
              <div className="view-toggle">
                <button className="on"><Grid3X3 size={14} /></button>
                <button><BookOpen size={14} /></button>
              </div>
            </div>
            <div className="pair-list">
              {pairs.map(p => (
                <button
                  key={p.id}
                  className={selected === p.id ? 'pair selected' : 'pair'}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="pair-top">
                    <span>{p.category}</span>
                    <Heart size={15} fill={p.favorite ? '#e88769' : 'none'} color={p.favorite ? '#e88769' : '#aeb5b7'} />
                  </div>
                  <strong style={{fontFamily: p.id === 1 ? 'Fraunces' : 'Georgia'}}>{p.heading}</strong>
                  <p style={{fontFamily: p.id === 1 ? 'DM Sans' : 'Arial'}}>{p.body}</p>
                  <div className="pair-foot">
                    <span>{p.title}</span>
                    <small>Open canvas →</small>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="studio">
            <div className="studio-head">
              <div>
                <span>PAIRING CANVAS</span>
                <h2>{current.title}</h2>
              </div>
              <button className="favorite" onClick={toggleFav}>
                <Star size={16} fill={current.favorite ? '#e5a35e' : 'none'} color={current.favorite ? '#e5a35e' : '#98a4a7'} />
              </button>
            </div>
            <div className="canvas">
              <div className="canvas-bar">
                <span>PREVIEW</span>
                <div>
                  <button>Desktop</button>
                  <button>Tablet</button>
                  <button>Mobile</button>
                </div>
              </div>
              <div className="preview">
                <span className="preview-kicker">A NOTE ON TYPE</span>
                <h3 style={{fontFamily: headingFont, fontSize: `${size}px`, fontWeight: weight, letterSpacing: `${tracking}px`, lineHeight: 1.05}}>
                  {current.heading}
                </h3>
                <p style={{fontFamily: bodyFont, lineHeight, letterSpacing: `${tracking / 2}px`}}>{current.body}</p>
                <div className="preview-rule" />
                <span className="preview-meta">PAIRING 0{current.id} · {current.category.toUpperCase()}</span>
              </div>
            </div>
            <div className="controls">
              <div className="control-head">
                <div>
                  <span>TYPE CONTROLS</span>
                  <h3>Fine tune your pairing</h3>
                </div>
                <SlidersHorizontal size={17} />
              </div>
              <div className="purpose-row">
                <label>
                  用途（加入清单时随快照记录）
                  <input
                    list="purpose-suggestions"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="如：官网首页横幅"
                  />
                </label>
                <datalist id="purpose-suggestions">
                  {PURPOSE_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="font-row">
                <label>Heading font
                  <select value={headingFont} onChange={e => setHeadingFont(e.target.value)}>
                    {FONTS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <label>Body font
                  <select value={bodyFont} onChange={e => setBodyFont(e.target.value)}>
                    {FONTS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </label>
              </div>
              <div className="range-row">
                <label>Size <b>{size}px</b>
                  <input type="range" min="28" max="76" value={size} onChange={e => setSize(Number(e.target.value))} />
                </label>
                <label>Weight <b>{weight}</b>
                  <input type="range" min="300" max="800" step="100" value={weight} onChange={e => setWeight(Number(e.target.value))} />
                </label>
              </div>
              <div className="range-row">
                <label>Line height <b>{leading.toFixed(2)}</b>
                  <input type="range" min="1" max="1.8" step=".05" value={leading} onChange={e => setLeading(Number(e.target.value))} />
                </label>
                <label>Letter spacing <b>{tracking}px</b>
                  <input type="range" min="-1" max="3" step=".5" value={tracking} onChange={e => setTracking(Number(e.target.value))} />
                </label>
              </div>
            </div>
            <div className="studio-foot">
              <button
                className="delete"
                onClick={() => {
                  setPairs(ps => ps.filter(p => p.id !== selected));
                  setSelected(pairs.find(p => p.id !== selected)?.id || 0);
                }}
              >
                <Trash2 size={15} />Delete pairing
              </button>
              <div className="foot-right">
                <button className="add-shortlist" onClick={addToShortlist}>
                  <ListPlus size={15} /> 加入选样清单
                </button>
                <button className="save" onClick={() => localStorage.setItem('type-pairs', JSON.stringify(pairs))}>
                  <Check size={13} /> Saved locally
                </button>
              </div>
            </div>
          </section>
        </div>

        <ShortlistPanel
          list={shortlist}
          pairs={pairs}
          fonts={FONTS}
          studioSpec={{headingFont, bodyFont, headingSizePx: size, lineHeight: leading}}
          notice={notice}
          onSubstitute={handleSubstitute}
          onProposeParams={handleProposeParams}
          onConfirmRevision={id => shortlist && applyResult(confirmRevision(shortlist, id, nowIso()))}
          onDiscardRevision={id => shortlist && applyResult(discardRevision(shortlist, id, nowIso()))}
          onConfirmList={() => shortlist && applyResult(confirmShortlist(shortlist, nowIso()))}
        />
      </main>

      {showAdd && (
        <div className="backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New pairing</h2>
            <label>
              Pairing name
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Quiet confidence" />
            </label>
            <div className="modal-actions">
              <button className="outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="primary" onClick={create}>Create pairing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
