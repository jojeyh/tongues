import { useState } from 'react';
import './App.css';

const App = () => {
    const [words, setWords] = useState<string[]>([])

    const output = document.getElementById('output');
    window.scribeApi.onProcessOutput((e: any, message: string) => { 
        addWords(message.split(' '));
    })

    const addWords = (wordsToAdd: string[]) => {
        setWords([
            ...words,
            ...wordsToAdd,
        ]);
    }

    const startTranscribe = (e: any) => {
        window.scribeApi.startTranscribe();
    }

    const stopTranscription = (e: any) => {
        window.scribeApi.stopTranscribe();
    }

    return (
        <div className='container'>
            <div className='header'>
                <div style={{
                    fontSize: 30,
                }}>tongues</div>
            </div>
            <div className='controls'>
                <button onClick={startTranscribe}>Transcribe</button>
                <button onClick={stopTranscription}>Stop</button>
            </div>
            <div className='left'>
                {words.map(word => (
                    <div onClick={() => console.log(word)}>{word}</div>
                ))}
            </div>
            <div className='right'>
                <div className='translation'>
                    translations go here
                </div>
            </div>
        </div>
    )
}

export default App;