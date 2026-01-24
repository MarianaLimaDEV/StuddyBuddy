/**
 * Sound Manager Module
 * Handles audio playback for the application
 */

// Sound file mappings - maps sound names to file paths
// Only include sounds that actually exist in /public/sfx/
const SOUND_FILES = {
  'intro': '/sfx/INTRO.mp3',
  'open': '/sfx/OPEN.mp3',
  'close': '/sfx/CLOSE.mp3',
  'click': '/sfx/CLICK.mp3',
  'interact': '/sfx/INTERACT.mp3',
  'notification': '/sfx/NOTIFICATION.mp3',
  'alarm': '/sfx/ALARM.mp3',
  'reset': '/sfx/RESET.mp3',
  // Aliases for missing sounds - use available sounds instead
  'task_add': '/sfx/CLICK.mp3',      // Use CLICK for task add
  'task_delete': '/sfx/CLOSE.mp3',   // Use CLOSE for task delete
  'task_toggle': '/sfx/CLICK.mp3',    // Use CLICK for task toggle
  'mute_toggle': '/sfx/CLICK.mp3',   // Use CLICK for mute toggle
  'login': '/sfx/OPEN.mp3',          // Use OPEN for login
  'countdown_stop': '/sfx/RESET.mp3', // Use RESET for countdown stop
  'timezone_add': '/sfx/OPEN.mp3',   // Use OPEN for timezone add
  'timezone_remove': '/sfx/CLOSE.mp3', // Use CLOSE for timezone remove
};

// Audio cache for preloaded sounds
const audioCache = new Map();
let soundEnabled = true;
let audioContextUnlocked = false;
const SOUND_MUTED_STORAGE_KEY = 'soundMuted';

// Load persisted mute state (best-effort)
try {
  const savedMuted = localStorage.getItem(SOUND_MUTED_STORAGE_KEY);
  if (savedMuted === 'true') soundEnabled = false;
} catch (e) {
  // ignore (privacy mode / disabled storage)
}

/**
 * Unlock audio context on first user interaction
 * Browsers block autoplay until user interaction
 */
function unlockAudioContext() {
  if (audioContextUnlocked) return;
  
  // Try to play a silent sound to unlock audio
  const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
  silentAudio.volume = 0.01;
  silentAudio.play()
    .then(() => {
      audioContextUnlocked = true;
      console.info('🔊 Audio context unlocked');
      silentAudio.pause();
    })
    .catch(err => {
      console.warn('Could not unlock audio context:', err);
    });
}

// Unlock audio on any user interaction
document.addEventListener('click', unlockAudioContext, { once: true });
document.addEventListener('keydown', unlockAudioContext, { once: true });
document.addEventListener('touchstart', unlockAudioContext, { once: true });

/**
 * Preload a sound file into cache
 * @param {string} soundName - Name of the sound to preload
 */
function preloadSound(soundName) {
  if (audioCache.has(soundName)) return;

  const filePath = SOUND_FILES[soundName];
  if (!filePath) {
    console.warn(`Sound "${soundName}" not found in sound mappings`);
    return;
  }

  const audio = new Audio(filePath);
  audio.preload = 'auto';
  audio.volume = 0.7; // Set volume to 70%
  
  // Add error handling for loading
  audio.addEventListener('error', (e) => {
    console.error(`❌ Failed to load sound "${soundName}" from "${filePath}":`, e);
    console.error(`❌ Error details:`, {
      code: audio.error?.code,
      message: audio.error?.message,
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE: 3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4
    });
  });
  
  audio.addEventListener('canplaythrough', () => {
    // Only log in development
    if (import.meta.env?.DEV) {
      console.debug(`✅ Sound "${soundName}" loaded successfully`);
    }
  });
  
  audio.addEventListener('loadstart', () => {
    // Only log in development
    if (import.meta.env?.DEV) {
      console.debug(`🔄 Loading sound "${soundName}"...`);
    }
  });
  
  audioCache.set(soundName, audio);
}

/**
 * Preload all known sounds
 */
function preloadAllSounds() {
  Object.keys(SOUND_FILES).forEach(soundName => {
    preloadSound(soundName);
  });
}

/**
 * Initialize the sound manager
 */
export function initSoundManager() {
  // Preload all sounds for better performance
  preloadAllSounds();
  console.info('🔊 Sound manager initialized');
  
  // Log available sounds
  if (import.meta.env?.DEV) {
    console.info(`🔊 Available sounds: ${Object.keys(SOUND_FILES).join(', ')}`);
  }
  
  // Try to unlock audio context immediately
  unlockAudioContext();
}

/**
 * Play a sound by name
 * @param {string} soundName - Name of the sound to play
 * @param {Object} options - Playback options
 * @param {boolean} options.overlap - Allow overlapping sounds (default: false)
 */
export function playSound(soundName, { overlap = false } = {}) {
  if (!soundEnabled) {
    if (import.meta.env?.DEV) {
      console.debug(`Sound "${soundName}" skipped (sound disabled)`);
    }
    return;
  }

  const filePath = SOUND_FILES[soundName];
  if (!filePath) {
    console.warn(`Sound "${soundName}" not configured`);
    return;
  }

  const audio = audioCache.get(soundName);
  if (audio) {
    // Clone the audio for overlapping playback if needed
    if (overlap) {
      const clone = audio.cloneNode();
      clone.volume = audio.volume || 0.7;
      clone.play()
        .then(() => {
          if (import.meta.env?.DEV) {
            console.debug(`Playing sound "${soundName}" (overlap)`);
          }
        })
        .catch(err => {
          console.error(`Failed to play sound "${soundName}":`, err);
          // Try fallback
          tryFallbackPlay(soundName, filePath);
        });
    } else {
      // Reset and play
      audio.currentTime = 0;
      audio.volume = audio.volume || 0.7;
      audio.play()
        .then(() => console.debug(`Playing sound "${soundName}"`))
        .catch(err => {
          console.error(`Failed to play sound "${soundName}":`, err);
          // Try fallback
          tryFallbackPlay(soundName, filePath);
        });
    }
  } else {
    // Fallback: try to create and play audio directly
    tryFallbackPlay(soundName, filePath);
  }
}

/**
 * Fallback method to play sound directly (when cache fails)
 */
function tryFallbackPlay(soundName, filePath) {
  try {
    const audio = new Audio(filePath);
    audio.volume = 0.7;
    audio.play()
      .then(() => {
        if (import.meta.env?.DEV) {
          console.debug(`Playing sound "${soundName}" (fallback)`);
        }
      })
      .catch(err => console.error(`Fallback play failed for "${soundName}":`, err));
  } catch (err) {
    console.error(`Could not create audio for "${soundName}":`, err);
  }
}

/**
 * Play a sound with overlap allowed (can play same sound multiple times simultaneously)
 * @param {string} soundName - Name of the sound to play
 */
export function playSoundWithOverlap(soundName) {
  playSound(soundName, { overlap: true });
}

/**
 * Toggle sound on/off
 * @returns {boolean} - Muted state (true = muted, false = unmuted)
 */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  console.info(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`);
  try {
    localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(!soundEnabled));
  } catch (e) {
    // ignore
  }
  return !soundEnabled;
}

/**
 * Check if sound is enabled
 * @returns {boolean}
 */
export function isSoundMuted() {
  return !soundEnabled;
}

/**
 * Set sound enabled/disabled state
 * @param {boolean} muted - Whether to mute sounds
 */
export function setSoundMuted(muted) {
  soundEnabled = !muted;
  try {
    localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(muted));
  } catch (e) {
    // ignore
  }
}

/**
 * Test function to check if sounds are working
 * Call this from browser console: window.testSound('click')
 */
export function testSound(soundName = 'click') {
  console.log(`🔊 Testing sound: ${soundName}`);
  console.log(`🔊 Sound enabled: ${soundEnabled}`);
  console.log(`🔊 Audio context unlocked: ${audioContextUnlocked}`);
  
  const filePath = SOUND_FILES[soundName];
  if (!filePath) {
    console.error(`❌ Sound "${soundName}" not found in mappings`);
    console.log(`Available sounds: ${Object.keys(SOUND_FILES).join(', ')}`);
    return;
  }
  
  console.log(`🔊 Attempting to play: ${filePath}`);
  
  // Try cached audio first
  const cachedAudio = audioCache.get(soundName);
  if (cachedAudio) {
    console.log('🔊 Using cached audio');
    cachedAudio.currentTime = 0;
    cachedAudio.volume = 0.7;
    cachedAudio.play()
      .then(() => console.log(`✅ Sound "${soundName}" played successfully`))
      .catch(err => {
        console.error(`❌ Failed to play cached audio:`, err);
        testDirectPlay(soundName, filePath);
      });
  } else {
    console.log('🔊 Cache miss, trying direct play');
    testDirectPlay(soundName, filePath);
  }
}

/**
 * Test direct audio playback
 */
function testDirectPlay(soundName, filePath) {
  const audio = new Audio(filePath);
  audio.volume = 0.7;
  
  audio.addEventListener('loadstart', () => console.log('🔊 Load started'));
  audio.addEventListener('loadeddata', () => console.log('🔊 Data loaded'));
  audio.addEventListener('canplay', () => console.log('🔊 Can play'));
  audio.addEventListener('canplaythrough', () => console.log('🔊 Can play through'));
  audio.addEventListener('error', (e) => {
    console.error(`❌ Audio error:`, e);
    console.error(`❌ Error code: ${audio.error?.code}`);
    console.error(`❌ Error message: ${audio.error?.message}`);
    console.error(`❌ File path: ${filePath}`);
    console.error(`❌ Try accessing this URL directly: http://localhost:5173${filePath}`);
  });
  
  audio.play()
    .then(() => console.log(`✅ Sound "${soundName}" played successfully (direct)`))
    .catch(err => {
      console.error(`❌ Failed to play audio:`, err);
      console.error(`❌ This might be a browser autoplay restriction. Try clicking somewhere first.`);
    });
}

// Expose test function to window for debugging
if (typeof window !== 'undefined') {
  if (import.meta.env?.DEV) {
    window.testSound = testSound;
    window.playSound = playSound;
    console.log('🔊 Sound debugging functions available:');
    console.log('  - window.testSound("click") - Test a specific sound');
    console.log('  - window.playSound("click") - Play a sound directly');
  }
}

