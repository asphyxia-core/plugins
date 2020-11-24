export async function readXML(path: string) {
    const xml = await IO.ReadFile(path, 'utf-8');
    const json = U.parseXML(xml, false)
    return json
}