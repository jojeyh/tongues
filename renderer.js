window.addEventListener('load', (e) => {
    const output = document.getElementById('output');

    const transcribeButton = document.getElementById('transcribe-btn');
    transcribeButton.addEventListener('click', (e) => {
      window.scribeApi.startTranscribe();
    })

    const stopTranscribeButton = document.getElementById('stop-transcribe-btn');
    stopTranscribeButton.addEventListener('click', (e) => {
      window.scribeApi.stopTranscribe();
    })

    window.scribeApi.onProcessOutput((event, message) => {
      output.innerText += message + '\n';
    })
});
