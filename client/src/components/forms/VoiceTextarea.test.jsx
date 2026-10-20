import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceTextarea from './VoiceTextarea.jsx';

let recognition;

class MockSpeechRecognition {
  constructor() {
    recognition = this;
  }

  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

describe('VoiceTextarea', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: MockSpeechRecognition });
  });

  afterEach(() => {
    cleanup();
    delete window.SpeechRecognition;
    recognition = null;
  });

  it('appends multilingual speech to the existing value', () => {
    const onChange = vi.fn();
    render(<VoiceTextarea value="Existing note" onChange={onChange} maxLength={100} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Voice typing language' }), { target: { value: 'hi-IN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start voice typing' }));

    expect(recognition.lang).toBe('hi-IN');
    expect(recognition.start).toHaveBeenCalledOnce();

    const result = [{ transcript: 'ग्राहक से मुलाकात की' }];
    result.isFinal = true;
    act(() => recognition.onresult({ resultIndex: 0, results: [result] }));

    expect(onChange).toHaveBeenLastCalledWith({ target: { value: 'Existing note ग्राहक से मुलाकात की' } });
  });
});
