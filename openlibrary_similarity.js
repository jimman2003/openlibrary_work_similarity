const stringSimilarity = require('string-similarity');
const fetch = require('node-fetch');

function getAuthorWorks(authorId) {
  return fetch(`https://openlibrary.org/authors/${authorId}/works.json?limit=1000`)
    .then((response) => response.json());
}

function getSimilarWorksByTitle(mainWork, allWorks, similarityThreshold = 0.9) {
  // main work is the one we want to find similar works to
  const worksExcludingMainWork = allWorks.filter((work) => work !== mainWork);
  const titles = worksExcludingMainWork.map((work) => work.title.toLowerCase());

  const similarities = stringSimilarity.findBestMatch(mainWork.title.toLowerCase(), titles);
  const similarWorks = similarities.ratings
    .map((result, index) => {
      if (result.rating > similarityThreshold) {
        return worksExcludingMainWork[index];
      }
    })
    .filter((work) => work !== undefined);

  similarWorks.push(mainWork);
  return {
    maxSimilarity:similarities.bestMatch.rating,
    works: similarWorks,
  };
}

function* findGroupsOfSimilar(authorWorks, similarityThreshold = 0.9) {
  const groups = [];
  let { entries } = authorWorks;
  console.log('Entry count:', entries.length);
  while (entries.length > 1) {
    const mainWork = entries.shift();
    const similarWorks = getSimilarWorksByTitle(mainWork, entries, similarityThreshold);
    if (similarWorks.maxSimilarity > similarityThreshold) {
      groups.push(similarWorks);
      entries = entries.filter((entry) => !similarWorks.works.includes(entry));
      yield similarWorks.works.map((work) => work.key.replace('/works/', '')).join(',');    
    }
  }
}

function main() {
  const authorId = process.argv[2];
  console.log('searching for works by', authorId);
  getAuthorWorks(authorId)
    .then((authorWorks) => {
      for (const work of findGroupsOfSimilar(authorWorks)) { console.log(work); }
    });
}

main();
