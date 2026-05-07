// =============================================================================
// User presets — CRUD helpers backed by Supabase user_presets table.
// RLS enforces that:
//   - users can only read their own presets
//   - only Pro users (plan='studio' | 'founder') can insert/update
//   - any user can delete their own presets
// =============================================================================

import { supabase } from './supabase';
import type {
  DitheringAlgorithm,
  ColorMode,
  ImageAdjustments,
  ResamplingMethod,
  ColorModeSettings,
  PaletteModifiers,
  PostProcessing,
} from '../types';

export interface PresetConfig {
  algorithm: DitheringAlgorithm;
  colorMode: ColorMode;
  selectedPalette: number;
  colorCount: number;
  resamplingMethod: ResamplingMethod;
  adjustments: ImageAdjustments;
  colorModeSettings: ColorModeSettings;
  paletteModifiers: PaletteModifiers;
  postProcessing: PostProcessing;
}

export interface Preset {
  id: string;
  name: string;
  config: PresetConfig;
  created_at: string;
  updated_at: string;
}

export const MAX_PRESET_NAME_LENGTH = 60;

export async function listPresets(): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('user_presets')
    .select('id, name, config, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Preset[];
}

export async function createPreset(
  name: string,
  config: PresetConfig,
): Promise<Preset> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('preset_name_required');
  if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
    throw new Error('preset_name_too_long');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const { data, error } = await supabase
    .from('user_presets')
    .insert({ user_id: userId, name: trimmed, config })
    .select('id, name, config, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as Preset;
}

export async function updatePreset(
  id: string,
  patch: { name?: string; config?: PresetConfig },
): Promise<Preset> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error('preset_name_required');
    if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
      throw new Error('preset_name_too_long');
    }
    update.name = trimmed;
  }
  if (patch.config !== undefined) update.config = patch.config;

  const { data, error } = await supabase
    .from('user_presets')
    .update(update)
    .eq('id', id)
    .select('id, name, config, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as Preset;
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase.from('user_presets').delete().eq('id', id);
  if (error) throw error;
}
