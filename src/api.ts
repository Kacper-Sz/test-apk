
import { getTokens, saveTokens, removeTokens, removeUser } from './Storage';


/*

ALE CHYBA COS MI TU DO KONCA NIE DZIALA 
TRZEBA ZALOGOWAC SIE 
POCZEKAC 30 MIN NA ODPALONEJ KARCIE 
I WTEDY W SEKCJI NETWORK POWINNO BYC CO SIE ZWRACA

glowny cel to obsluga zapytan z automatyczna PROBA odswiezenia tokenow przy 401 i przekierowanie do logowania gdy odswiezenie sie nie powiedzie
dlatego zamiast fetch uzywamy apiFetch ktory robi to wszystko w srodku i zwraca odpowiedz z serwera (lub wyrzuca blad jesli sie cos zepsulo)
dzieki temu w kodzie pozostalym nie musimy sie juz przejmowac tokenami odswiezaniem itp tylko normalnie robimy zapytania do API i obslugujemy odpowiedzi

natomiast jak token bedzie niewazny to apiFetch sprobuje go odswiezyc
jesli sie nie uda to wywali blad i przekieruje do logowania (usunie tez dane z localStorage)

*/


const BASE_URL = 'https://carton-api-dev-dkawh3e2cjbhanen.swedencentral-01.azurewebsites.net';

let refreshPromise: Promise<boolean> | null = null;

const refreshTokens = async (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const tokens = getTokens();
        if (!tokens?.refreshToken) return false;

        try {
            const res = await fetch(`${BASE_URL}/api/tokens/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: tokens.refreshToken })
            });

            if (!res.ok) return false;

            const data = await res.json();
            saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
            return true;
        } catch {
            return false;
        } finally {
            refreshPromise = null; // reset po zakończeniu
        }
    })();

    return refreshPromise;
};
export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const tokens = getTokens();

    const makeRequest = (accessToken: string) => fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    let res = await makeRequest(tokens?.accessToken ?? '');

    if (res.status === 401) {
        const refreshed = await refreshTokens();

        if (!refreshed) {
            // refresh nie dziala - usuwamy dane i wysylamy do logowania
            removeTokens();
            removeUser();
            window.location.href = '/login';
            throw new Error('Sesja wygasła.');
        }

        const newTokens = getTokens();
        res = await makeRequest(newTokens?.accessToken ?? '');
    }

    return res;
};