"""
PoC - security research. Proves untrusted PR code executes without approval.
"""
import unittest
import sys

class TestPocMarker(unittest.TestCase):
    def test_poc_marker(self):
        marker = "POC_MARKER_1772017650_emcrtrkc"
        print(marker, flush=True)
        sys.stdout.flush()
        self.assertTrue(True)
