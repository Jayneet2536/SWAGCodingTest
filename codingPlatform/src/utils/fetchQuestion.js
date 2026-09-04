import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config

const shuffleArray = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// ① pick up to `count` random items from a pool, warn if the pool is short
const pickRandom = (pool, count, label) => {
  if (pool.length < count) {
    console.warn(`Only ${pool.length} ${label} question(s) available — need ${count}.`);
  }
  return shuffleArray(pool).slice(0, count);
};

/**
 * Builds one student's fixed question set for a test:
 * - 10 MCQ + 5 theory + 5 code-analysis from their preferred committee
 * - 2 random DSA questions (any type)
 * Combined and shuffled together. Called ONCE, at test start — the result
 * (question IDs) is saved to the attempt doc and reused on every reload.
 *
 * @param {string} preferredCommittee - 'web' | 'app' | 'graphics'
 * @returns {Promise<Array>} shuffled array of question objects with id
 */
export const fetchQuestionsForCommittee = async (preferredCommittee) => {
  try {
    const [mcqSnap, theorySnap, codeSnap, dsaSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'questions'),
        where('committee', '==', preferredCommittee),
        where('type', '==', 'mcq')
      )),
      getDocs(query(
        collection(db, 'questions'),
        where('committee', '==', preferredCommittee),
        where('type', '==', 'theory'),
        where('category', '==', 'theory')
      )),
      getDocs(query(
        collection(db, 'questions'),
        where('committee', '==', preferredCommittee),
        where('type', '==', 'theory'),
        where('category', '==', 'code_analysis')
      )),
      getDocs(query(
        collection(db, 'questions'),
        where('committee', '==', 'dsa')
      )),
    ]);

    const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const mcqPicked = pickRandom(toList(mcqSnap), 10, 'MCQ');
    const theoryPicked = pickRandom(toList(theorySnap), 5, 'theory');
    const codePicked = pickRandom(toList(codeSnap), 5, 'code analysis');
    const dsaPicked = pickRandom(toList(dsaSnap), 2, 'DSA');

    const combined = [...mcqPicked, ...theoryPicked, ...codePicked, ...dsaPicked];

    return shuffleArray(combined);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

// fetchQuestionsByIds unchanged — keep exactly as you had it
export const fetchQuestionsByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  try {
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }

    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db, 'questions'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      })
    );

    const questionsById = {};
    chunkResults.flat().forEach((q) => {
      questionsById[q.id] = q;
    });

    return ids.map((id) => questionsById[id]).filter(Boolean);
  } catch (error) {
    console.error('Error fetching questions by ids:', error);
    return [];
  }
};