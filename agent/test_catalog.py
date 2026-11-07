import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / "lessons" / "catalog.json"
REQUIRED_LESSON = ("id", "title", "arTitle", "icon", "blurb")
REQUIRED_PHRASE = ("id", "ar", "tr", "en")

class CatalogTests(unittest.TestCase):
    def test_catalog_and_ids(self):
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        self.assertIs(type(data.get("version")), int)
        self.assertGreaterEqual(data["version"], 1)
        lessons = data.get("lessons")
        self.assertIsInstance(lessons, list)
        lesson_ids, phrase_ids = set(), set()
        for lesson in lessons:
            self.assertIsInstance(lesson, dict)
            for field in REQUIRED_LESSON:
                self.assertIsInstance(lesson.get(field), str, field)
                self.assertTrue(lesson[field].strip(), field)
            self.assertRegex(lesson["id"], r"^[a-zA-Z0-9_-]+$")
            self.assertNotIn(lesson["id"], lesson_ids)
            lesson_ids.add(lesson["id"])
            phrases = lesson.get("phrases")
            self.assertIsInstance(phrases, list)
            self.assertGreaterEqual(len(phrases), 6)
            self.assertLessEqual(len(phrases), 10)
            for phrase in phrases:
                self.assertIsInstance(phrase, dict)
                for field in REQUIRED_PHRASE:
                    self.assertIsInstance(phrase.get(field), str, field)
                    self.assertTrue(phrase[field].strip(), field)
                self.assertNotIn(phrase["id"], phrase_ids)
                phrase_ids.add(phrase["id"])
                self.assertTrue(re.search(r"[\u0600-\u06ff]", phrase["ar"]), "Missing Arabic script")
                self.assertTrue(re.search(r"[a-zA-Z]", phrase["tr"]), "Missing transliteration")
            if "quiz" in lesson:
                self.assertIsInstance(lesson["quiz"], list)
                for question in lesson["quiz"]:
                    self.assertIsInstance(question, dict)
                    self.assertTrue(question)

if __name__ == "__main__":
    unittest.main()
