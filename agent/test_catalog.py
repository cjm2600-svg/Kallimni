import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / "lessons" / "catalog.json"

class CatalogTests(unittest.TestCase):
    def test_catalog(self):
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        self.assertIsInstance(data.get("version"), int)
        lessons = data.get("lessons")
        self.assertIsInstance(lessons, list)
        lesson_ids, phrase_ids = set(), set()
        for lesson in lessons:
            self.assertIsInstance(lesson.get("id"), str)
            self.assertTrue(lesson["id"])
            self.assertNotIn(lesson["id"], lesson_ids)
            lesson_ids.add(lesson["id"])
            self.assertIsInstance(lesson.get("phrases"), list)
            self.assertGreaterEqual(len(lesson["phrases"]), 6)
            for phrase in lesson["phrases"]:
                for key in ("id", "ar", "tr", "en"):
                    self.assertIsInstance(phrase.get(key), str)
                    self.assertTrue(phrase[key].strip())
                self.assertNotIn(phrase["id"], phrase_ids)
                phrase_ids.add(phrase["id"])

if __name__ == "__main__":
    unittest.main()
