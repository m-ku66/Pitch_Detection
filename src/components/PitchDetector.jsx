import React, { useState } from "react";

const PitchDetector = () => {
  const [pitch, setPitch] = useState(null);
  const [error, setError] = useState(null);
  const [isAudioContextStarted, setIsAudioContextStarted] = useState(false);

  const startAudioContext = async () => {
    try {
      // Ensure AudioContext is started in response to a user gesture
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      await audioContext.resume();
      setIsAudioContextStarted(true);

      // Access the user's microphone
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Float32Array(bufferLength);

          // Connect the source to the analyser
          source.connect(analyser);

          // Function to get pitch
          const detectPitch = () => {
            analyser.getFloatTimeDomainData(dataArray);

            // Remove DC offset
            const mean =
              dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            for (let i = 0; i < dataArray.length; i++) {
              dataArray[i] -= mean;
            }

            // Normalize signal
            const maxAmplitude = Math.max(...dataArray.map(Math.abs));
            for (let i = 0; i < dataArray.length; i++) {
              dataArray[i] /= maxAmplitude;
            }

            // Calculate autocorrelation
            let bestOffset = -1;
            let bestCorrelation = 0;
            for (let offset = 0; offset < bufferLength; offset++) {
              let correlation = 0;
              for (let i = 0; i < bufferLength - offset; i++) {
                correlation += dataArray[i] * dataArray[i + offset];
              }
              if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
              }
            }

            console.log("Correlation:", bestCorrelation);
            console.log("Best offset:", bestOffset);

            // Calculate pitch from best offset
            if (bestOffset !== -1) {
              const sampleRate = audioContext.sampleRate;
              const fundamentalFrequency = sampleRate / bestOffset;
              const pitchValue = fundamentalFrequency;

              console.log("Pitch value:", pitchValue);

              // Update pitch state
              setPitch(pitchValue);
            } else {
              console.log("No pitch detected");
              setPitch(null);
            }
          };

          // Call detectPitch repeatedly
          const intervalId = setInterval(detectPitch, 100);

          // Clean up function
          return () => {
            clearInterval(intervalId);
            audioContext.close();
            source.disconnect();
            analyser.disconnect();
          };
        })
        .catch((err) => {
          setError("Error accessing microphone: " + err.message);
        });
    } catch (err) {
      setError("Failed to start AudioContext: " + err.message);
    }
  };

  return (
    <div>
      {!isAudioContextStarted && (
        <button onClick={startAudioContext}>Start AudioContext</button>
      )}
      {error && <p>Error: {error}</p>}
      {pitch && <p>Pitch: {pitch.toFixed(2)} Hz</p>}
      {!pitch && isAudioContextStarted && <p>Listening for pitch...</p>}
    </div>
  );
};

export default PitchDetector;
