export async function readXML(path: string) {
    const xml = await IO.ReadFile(path, 'utf-8');
    const json = U.parseXML(xml, false)
    return json
}

export async function readJSON(path: string) {
    const str = await IO.ReadFile(path, 'utf-8');
    const json = JSON.parse(str)
    return json
}