Fejlen er bekræftet: transskriptionsfunktionen kalder ElevenLabs med `ELEVENLABS_API_KEY`, og ElevenLabs svarer `401 invalid_api_key`. I stedet for at jagte en ny ElevenLabs-nøgle retter vi transskriptionen til den indbyggede Lovable AI speech-to-text, som allerede har `LOVABLE_API_KEY` i projektet.

Plan:
1. Opdatér `voice-transcribe` backend-funktionen til at bruge Lovable AI Gateway endpointet `/v1/audio/transcriptions` med modellen `openai/gpt-4o-mini-transcribe`.
2. Bevar de eksisterende klientkald og UI uændret, så dialogen stadig uploader samme audio og modtager `{ text }` tilbage.
3. Send audio som `multipart/form-data`, match filendelsen til MIME-typen, og undlad manuelt `Content-Type`, så multipart-boundary bliver korrekt.
4. Bevar validering for manglende/tom audio og forbedr fejlbeskeden, så eventuelle gateway/provider-fejl vises tydeligt.
5. Fjerne afhængigheden af `ELEVENLABS_API_KEY` fra transskription, så 401-fejlen ikke længere blokerer optagelser.