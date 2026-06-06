/**
 * Map에서 이름 부분 매칭으로 값을 찾는다.
 * 정확한 매칭 우선, 부분 매칭 시 가장 긴 키를 우선한다.
 * (예: "김은지" > "김은")
 */
export function findByNameContains<T>(map: Map<string, T>, searchName: string): T | undefined {
    if (!searchName) return undefined;
    const exact = map.get(searchName);
    if (exact) return exact;

    let bestMatch: {key: string; value: T} | undefined;
    for (const [key, value] of map) {
        if (key.includes(searchName) || searchName.includes(key)) {
            if (!bestMatch || key.length > bestMatch.key.length) {
                bestMatch = {key, value};
            }
        }
    }
    return bestMatch?.value;
}
