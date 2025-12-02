/**
 * Very simplified syllabus parsing logic
 * In a real system this would interface with OpenAI or another LLM
 */

function parseSyllabusText(text) {
    const lines = text.split("\n");

    let title = lines[0] || "Untitled Course";

    const categories = [];

    for (let line of lines) {
        const match = line.match(/(\w+)\s*-\s*(\d+)%/i);
        if (match) {
            categories.push({
                name: match[1],
                weight: Number(match[2]),
                items: []
            });
        }
    }

    return { title, categories };
}

module.exports = { parseSyllabusText };
