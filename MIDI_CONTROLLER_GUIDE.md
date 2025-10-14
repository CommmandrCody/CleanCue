# MIDI Controller Setup Guide

## Quick Start

1. **Plug in your USB MIDI controller** to your computer
2. **Launch CleanCue DJ**
3. **Open the DJ Deck** (press `7` or click "DJ Deck" in sidebar)
4. **Check the header** - you should see "MIDI Connected" with a green indicator

That's it! The controller should auto-detect and connect via Web MIDI API.

## Supported Controllers

CleanCue DJ uses the **Web MIDI API** and works with most USB MIDI controllers including:

- **Serato-compatible controllers** (DJ-202, Rane, Pioneer DDJ series)
- **Native Instruments Traktor controllers**
- **Numark controllers**
- **Hercules DJ controllers**
- **Any USB MIDI device** that sends standard MIDI CC messages

## Default MIDI Mapping

### Control Changes (CC Messages)

| Control | MIDI CC | Function |
|---------|---------|----------|
| CC 0x01 | 1 | Crossfader |
| CC 0x07 | 7 | Deck A Volume (Channel 0) |
| CC 0x0B | 11 | Deck B Volume (Channel 1) |
| CC 0x10 | 16 | Deck A EQ High |
| CC 0x11 | 17 | Deck A EQ Mid |
| CC 0x12 | 18 | Deck A EQ Low |
| CC 0x13 | 19 | Deck B EQ High |
| CC 0x14 | 20 | Deck B EQ Mid |
| CC 0x15 | 21 | Deck B EQ Low |
| CC 0x20 | 32 | Deck A Pitch/Tempo |
| CC 0x21 | 33 | Deck B Pitch/Tempo |

## Troubleshooting

### Controller Not Detected

1. **Check USB Connection**: Ensure controller is properly connected via USB
2. **Browser Permissions**: Web MIDI API requires permission - check your browser allowed the MIDI access
3. **Driver Installation**: Some controllers need drivers installed first (check manufacturer website)
4. **Try Different Port**: Try a different USB port
5. **Restart**: Unplug controller, restart CleanCue, plug back in

### Controller Detected But Not Responding

1. **Check MIDI Mode**: Ensure your controller is in MIDI mode (not HID mode)
2. **Select Correct Device**: Use the dropdown in the header to select your controller if multiple devices are detected
3. **Check Mappings**: Your controller might send different CC numbers - you may need custom mapping

### Multiple Controllers

If you have multiple MIDI devices:
- Use the **dropdown in the header** to select which device to use
- CleanCue will auto-select the first device by default

## Custom MIDI Mapping

The MIDI mapping is defined in the `DJDeck.tsx` component's `handleMIDIControl` function. To customize:

1. Open DevTools Console (Cmd+Option+I on Mac)
2. Look for MIDI messages being logged when you move controls
3. Note the CC numbers your controller sends
4. Modify the switch statement in `handleMIDIControl` to match your controller

## Web MIDI API Support

**Supported Browsers:**
- ✅ Chrome/Chromium
- ✅ Edge
- ✅ Opera
- ⚠️ Safari (limited support)
- ❌ Firefox (requires flag)

**Electron Support:**
- ✅ Fully supported (CleanCue runs on Electron)

## Tips for Best Performance

1. **Low Latency**: USB MIDI has very low latency (~1-2ms)
2. **Close Other DJ Software**: Only one app can control the MIDI device at a time
3. **Direct USB Connection**: Don't use USB hubs for best performance
4. **Driver Updates**: Keep your controller's drivers up to date

## Popular Controller Setup Examples

### Serato DJ Controllers

Most Serato controllers work out of the box:
- **Pioneer DDJ-SB3/SB2**: Plug and play
- **Rane SL series**: Works in MIDI mode
- **Numark Mixtrack**: Fully compatible

### Native Instruments

- Set controller to **MIDI mode** in preferences
- Map controls as needed

### Generic MIDI Controllers

- Works with any MIDI controller
- May need custom mapping for optimal use

## Need Help?

If your controller isn't working:
1. Check the DevTools Console for MIDI messages
2. Verify your controller sends CC messages (not just notes)
3. Open an issue at: https://github.com/your-repo/cleancue/issues

---

**Note**: MIDI controller support is through the standard Web MIDI API. CleanCue doesn't require proprietary drivers or special software - it just works!
