import React, { useState } from "react";

const PitchDetector = () => {
  const [note, setNote] = useState(null);

  const handleStartDetection = () => {
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = audioContext.createAnalyser();
    let mediaStreamSource = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(analyser);
        updatePitch();
      })
      .catch(function (err) {
        console.error("Error accessing microphone", err);
      });

    const updatePitch = () => {
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      analyser.getFloatTimeDomainData(dataArray);

      let ac = autoCorrelate(dataArray, audioContext.sampleRate);

      if (!isNaN(ac) && ac !== -1) {
        let pitch = audioContext.sampleRate / ac;
        console.log("Pitch:", pitch); // Log the pitch value for debugging
        let note = pitchToNote(pitch);
        console.log("Note:", note); // Log the calculated note for debugging
        setNote(note);
      } else {
        setNote(null);
      }

      setTimeout(updatePitch, 100); // Update pitch every 100ms
    };

    const autoCorrelate = (buf, sampleRate) => {
      let SIZE = buf.length;
      let MAX_SAMPLES = Math.floor(SIZE / 2);
      let best_offset = -1;
      let best_correlation = 0;
      let rms = 0;
      let foundGoodCorrelation = false;
      let correlations = new Array(MAX_SAMPLES);

      for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
      }
      rms = Math.sqrt(rms / SIZE);
      if (rms < 0.01)
        // not enough signal
        return -1;

      let lastCorrelation = 1;
      for (let offset = 0; offset < MAX_SAMPLES; offset++) {
        let correlation = 0;

        for (let i = 0; i < MAX_SAMPLES; i++) {
          correlation += Math.abs(buf[i] - buf[i + offset]);
        }
        correlation = 1 - correlation / MAX_SAMPLES;
        correlations[offset] = correlation; // store it, for the tweaking we need to do below.
        if (correlation > 0.9 && correlation > lastCorrelation) {
          foundGoodCorrelation = true;
          if (correlation > best_correlation) {
            best_correlation = correlation;
            best_offset = offset;
          }
        } else if (foundGoodCorrelation) {
          let shift =
            (correlations[best_offset + 1] - correlations[best_offset - 1]) /
            correlations[best_offset];
          return sampleRate / (best_offset + 8 * shift);
        }
        lastCorrelation = correlation;
      }
      if (best_correlation > 0.01) {
        return sampleRate / best_offset;
      }
      return -1;
    };

    const pitchToNote = (pitch) => {
      // Define an array of note names
      const noteNames = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
      ];

      // Calculate the number of semitones from A4 (440Hz) based on the pitch value
      const semitone =
        12 * (Math.log2(pitch / 440.0) - Math.log2(440.0 / 16.35)); // Adjust for A0 being 16.35Hz

      // Calculate the note index and octave based on the semitone
      let noteIndex = Math.round(semitone) % 12; // Map the semitone to a note index (0-11)
      let octave = Math.floor((semitone + 9) / 12) + 4; // Adjust the octave based on A4 being in the 4th octave

      // Adjust the note index and octave if necessary
      if (noteIndex < 0) {
        noteIndex += 12;
      }
      if (noteIndex >= 12) {
        noteIndex -= 12;
        octave += 1;
      }

      // Construct the note name by combining the note name and octave
      return noteNames[noteIndex] + octave;
    };
  };

  return (
    <div className="max-w-full h-screen bg-lime-300 relative flex justify-center">
      <div className="absolute mt-[20%] flex flex-col">
        <h2 className="poetsen text-[4rem]">Pitch Detector</h2>
        <button
          className="cursor-pointer focus:text-white"
          onClick={handleStartDetection}
        >
          Start Detection
        </button>
        {note !== null ? (
          <p className="text-center poetsen text-[5rem]">{note}</p>
        ) : (
          <p className="text-center poetsen text-[5rem]">...</p>
        )}
      </div>
    </div>
  );
};

export default PitchDetector;
