import { useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import { Button, CircularProgress, IconButton } from '@mui/material';
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import Dropdown from './Dropdown';
import { ArrowRight } from '@mui/icons-material';

interface TranslationResponse {
    translation: string;
}

const API_URL = 'https://api.tongues.media/';

const App = () => {
    const [sourceLang, setSourceLang] = useState<string>("Spanish");
    const [targetLang, setTargetLang] = useState<string>("English");
    const [words, setWords] = useState<string[]>([]);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const selectedTextRef = useRef<string | null>(null);

    useEffect(() => {
        const unlisten = listen('transcription', (event: any) => {
            if (event.payload) {
                const newWords = event.payload.split(' ');
                addWords(newWords);
            }
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const handleKeyDown = (event: any) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();  // Prevent the default behavior of Ctrl+Z in most browsers
            translateSelected(event);
        }
    };

    const handleSelectionChange = () => {
        const selection  = window.getSelection();
        const text = selection?.toString();
        if (text) {
            selectedTextRef.current = text;
        }
    }

    useEffect(() => {
        document.addEventListener('mouseup', handleSelectionChange);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keyup', handleSelectionChange);
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    const addWords = (wordsToAdd: string[]) => {
        const removedBlanks = wordsToAdd.filter(word => word !== "");
        setWords(prevWords => [
            ...prevWords,
            ...removedBlanks,
        ]);
    }

    const startTranscribe = (e: any) => {
        e.preventDefault();
        invoke('start_listening').then(() => console.log('listening...'));
        setIsTranscribing(true);
    }

    const stopTranscription = (e: any) => {
        e.preventDefault();
        if (isTranscribing) {
            invoke('stop_listening');
            setIsTranscribing(false);
        }
    }
     
    const translateText = async (text: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post<TranslationResponse>(API_URL + 'translate', {
                text: text,
                src_lang: sourceLang,
                targ_lang: targetLang,
            });
            if (response.status == 200) {
                setTranslation(response.data['translation']);
            } else {
                throw new Error("Failed to fetch translation");
            }
            // const speechResponse = await axios.post(API_URL + 'speech', {
            //     text: text, 
            //     language: sourceLang,
            // });
            // if (speechResponse.status == 200) {
            //     const audioBlob = new Blob([speechResponse.data], { type: 'audio/mpeg' });
            //     const audioUrl = URL.createObjectURL(audioBlob);
            //     const audio = new Audio(audioUrl);
            //     await audio.play();
            // } else {
            //     console.log("Failed to fetch speech");
            // }
        } catch (err) {
            console.error("Error: ", err);
        }
        selectedTextRef.current = text;
        setIsLoading(false);
    }

    const translateSelected = (e: any) => {
        e.preventDefault();
        if (selectedTextRef.current?.length) {
            translateText(selectedTextRef.current);
        }
    }


    return (
        <div className='container'>
            <div className='controls'>
                <Dropdown label="source" language={sourceLang} setLanguage={setSourceLang} />
                <ArrowRight />
                <Dropdown label="target" language={targetLang} setLanguage={setTargetLang} />
                <div style={{marginLeft: 'auto'}}>
                    { isTranscribing ? 
                        <Button onClick={stopTranscription}>Stop</Button> :
                        <Button onClick={startTranscribe}>Transcribe</Button>
                    }
                </div>
            </div>
            <div className='left'>
                {words.map((word, index) => (
                    <div 
                        key={index}
                        className='word'
                        onClick={() => translateText(word)}
                    >{word}</div>
                ))}
            </div>
            <div className='center'>
                <IconButton onClick={translateSelected}>
                    <ArrowCircleRightIcon fontSize='large' />
                </IconButton>
            </div>
            <div className='right'>
                <div className='translation'>
                    { isLoading ? 
                        <CircularProgress size='large' /> :
                        <div className='translation'>
                            <div style={{paddingBottom: '20px'}}>
                                {selectedTextRef.current}
                            </div>
                            <div>
                                {translation}
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default App;
