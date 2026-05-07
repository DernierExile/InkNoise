import { useEffect, useState } from 'react';
import { Bookmark, Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { useT } from '../i18n/use-i18n';
import {
  listPresets,
  createPreset,
  deletePreset,
  MAX_PRESET_NAME_LENGTH,
  type Preset,
  type PresetConfig,
} from '../lib/presets';

interface PresetsManagerProps {
  isPro: boolean;
  isAuthed: boolean;
  currentConfig: PresetConfig;
  activePresetId: string | null;
  onApply: (preset: Preset) => void;
  onActivePresetIdChange: (id: string | null) => void;
  onUpgradeClick: () => void;
  onSignInClick: () => void;
}

export default function PresetsManager({
  isPro,
  isAuthed,
  currentConfig,
  activePresetId,
  onApply,
  onActivePresetIdChange,
  onUpgradeClick,
  onSignInClick,
}: PresetsManagerProps) {
  const t = useT();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed) {
      setPresets([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listPresets()
      .then((p) => {
        if (!cancelled) setPresets(p);
      })
      .catch((e) => {
        console.error('Failed to load presets', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const handleApply = (preset: Preset) => {
    onApply(preset);
    onActivePresetIdChange(preset.id);
    setOpen(false);
  };

  const handleSave = async () => {
    setError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setError(t('presets.errorNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const created = await createPreset(trimmed, currentConfig);
      setPresets([created, ...presets]);
      setShowSaveModal(false);
      setNewName('');
      onActivePresetIdChange(created.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown_error';
      setError(t('presets.errorSave', { msg }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreset(id);
      setPresets(presets.filter((p) => p.id !== id));
      if (activePresetId === id) onActivePresetIdChange(null);
    } catch (e) {
      console.error('Failed to delete preset', e);
    }
  };

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;

  // ---------------------------------------------------------------------------
  // Locked states (not authed / not pro)
  // ---------------------------------------------------------------------------

  if (!isAuthed) {
    return (
      <div className="panel-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3 h-3 text-bz-system" />
            <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">
              {t('presets.title')}
            </span>
          </div>
          <button
            onClick={onSignInClick}
            className="text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan transition-colors duration-240 px-2 py-1 tracking-widest uppercase"
          >
            {t('presets.signInToSave')}
          </button>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="panel-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3 h-3 text-bz-system" />
            <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">
              {t('presets.title')}
            </span>
          </div>
          <button
            onClick={onUpgradeClick}
            className="text-[10px] font-mono-ui text-bz-cyan border border-bz-grid hover:border-bz-cyan transition-colors duration-240 px-2 py-1 tracking-widest uppercase"
          >
            {t('presets.proRequired')}
          </button>
        </div>
        <p className="mt-2 text-[10px] font-mono-ui text-bz-system tracking-wide">
          {t('presets.proHint')}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Pro state — full UI
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="panel-surface p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3 h-3 text-bz-cyan" />
            <span className="text-[10px] font-mono-ui text-bz-paper tracking-widest uppercase">
              {t('presets.title')}
            </span>
          </div>
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan transition-colors duration-240 px-2 py-1 tracking-widest uppercase"
            title={t('presets.saveAria')}
          >
            <Plus className="w-3 h-3" />
            {t('presets.save')}
          </button>
        </div>

        {presets.length === 0 ? (
          <p className="text-[10px] font-mono-ui text-bz-system tracking-wide">
            {loading ? t('common.loading') : t('presets.empty')}
          </p>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-2 py-1.5 bg-bz-graphite border border-bz-grid hover:border-bz-system transition-colors duration-240 text-[10px] font-mono-ui tracking-widest uppercase"
            >
              <span className={activePreset ? 'text-bz-paper' : 'text-bz-system'}>
                {activePreset ? activePreset.name : t('presets.selectPlaceholder')}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-bz-system transition-transform duration-240 ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-bz-deep border border-bz-grid">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`group flex items-center justify-between gap-1 px-2 py-1.5 hover:bg-bz-graphite/60 transition-colors duration-240 ${
                      activePresetId === preset.id ? 'bg-bz-graphite/40' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleApply(preset)}
                      className="flex-1 text-left text-[10px] font-mono-ui text-bz-paper tracking-wide truncate"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-bz-system hover:text-bz-paper transition-opacity duration-240"
                      title={t('presets.deleteAria', { name: preset.name })}
                      aria-label={t('presets.deleteAria', { name: preset.name })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bz-graphite/80 backdrop-blur-sm"
          onClick={() => !saving && setShowSaveModal(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-bz-deep border border-bz-grid p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-ui text-bz-paper tracking-widest uppercase">
                {t('presets.savePresetTitle')}
              </span>
              <button
                onClick={() => !saving && setShowSaveModal(false)}
                className="text-bz-system hover:text-bz-paper transition-colors duration-240"
                aria-label={t('common.close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('presets.namePlaceholder')}
              maxLength={MAX_PRESET_NAME_LENGTH}
              autoFocus
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveModal(false);
              }}
              className="w-full px-3 py-2 bg-bz-graphite border border-bz-grid text-bz-paper text-[12px] focus:outline-none focus:border-bz-cyan transition-colors duration-240"
            />

            {error && (
              <p className="text-[10px] font-mono-ui text-bz-cyan tracking-wide">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => !saving && setShowSaveModal(false)}
                disabled={saving}
                className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-system hover:text-bz-paper tracking-widest uppercase transition-colors duration-240 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !newName.trim()}
                className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan tracking-widest uppercase transition-colors duration-240 disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
