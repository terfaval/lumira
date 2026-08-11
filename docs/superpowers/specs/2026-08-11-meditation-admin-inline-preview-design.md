# Meditation Admin Inline Preview Design

Date: 2026-08-11
Status: Draft approved in chat, written for review

## Goal

Improve the `meditations` admin editor so timing can be checked and refined without leaving editor mode.

## Problem

The current meditation editor stops the reader and background audio when editor mode is enabled. That makes text and pause-duration tuning slow because the admin must leave editor mode to preview the sequence.

## Scope

This slice only adds inline preview behavior inside admin editor mode for the meditation reader overlay.

In scope:
- start preview from the currently selected text block
- stop preview from the editor panel
- continue playback from the selected block through the rest of the meditation
- automatically stop preview when the admin interacts with real editing fields

Out of scope:
- true pause/resume
- timeline scrubbing
- waveform or transport UI
- changing normal non-admin reader behavior

## UX Decision

Use an inline preview control inside the editor panel.

Behavior:
- The editor shows a `Lejátszás` control when preview is idle.
- Starting preview begins at the currently selected text block, not from the beginning.
- Once running, the control changes to `Megállítás`.
- Preview continues through all remaining text and pause blocks until the meditation ends or the admin stops it.
- Preview stays inside editor mode. It does not switch back to normal reader mode.
- Preview stops automatically when the admin interacts with:
  - the text textarea
  - the tone select
  - the duration input
- Preview does not auto-stop when the admin uses:
  - previous/next navigation
  - block selector dropdown

## Technical Design

Add a separate preview playback state for editor mode rather than reusing the existing normal-reader lifecycle directly.

### Reader engine

The current reader engine starts from the beginning only. It should be extended so editor preview can start from an arbitrary block index.

Expected capability:
- start from a provided reader block index
- report current text/block as playback advances
- stop cleanly and reset preview state

This should preserve current default behavior for normal reading mode by keeping the zero-index start as the default path.

### Editor preview state

`MeditationReader` should manage a dedicated editor preview state:
- idle
- running

When preview starts:
- resolve the selected text block's underlying reader block index
- start reader playback from that block index
- start audio playback using the same meditation audio config when available

When preview stops:
- stop the reader engine
- stop the audio engine
- keep editor mode and the current selected block unchanged

### Auto-stop triggers

The editor should stop preview on direct interaction with editing controls. The simplest reliable implementation is to call a shared `stopEditorPreview()` handler from focus/pointer handlers attached to:
- textarea
- tone select
- duration input

This should happen before or as editing begins so preview never competes with text adjustment.

### Audio behavior

Audio support is desirable in editor preview and should reuse the existing audio engine when the meditation has audio configuration.

Preview audio should:
- start with preview playback
- use the same layer/block index progression as normal reading
- stop immediately on manual stop or editor-field interaction

If a meditation has no usable audio config, text preview still works.

## Risks And Constraints

- Starting playback from a mid-meditation block may expose assumptions in the current reader/audio engines that only hold for zero-based starts.
- Audio layers that depend on earlier block transitions must still behave coherently when preview starts midstream.
- Editor preview must not interfere with normal reader mode completion logic or exit behavior.

## Validation

Minimum verification for implementation:
- admin can enter editor mode and start preview from the selected block
- preview advances through subsequent blocks and pauses
- `Megállítás` fully stops text and audio playback
- clicking or focusing any real editing field stops preview
- navigation controls do not auto-stop preview
- normal non-editor reader mode still starts from the beginning and completes as before

## Acceptance Shape

The feature is done when meditation timing can be iterated entirely inside admin editor mode without leaving the editor just to check playback.
