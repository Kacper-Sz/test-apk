

export async function test_api(): Promise<any | null> {
    try {
        const response = await fetch("http://localhost:5233/api/user");
        const json = await response.json();
        return json;
    }
    catch(e) {
        console.log("Can not reach API!");
    }
    return null;
}