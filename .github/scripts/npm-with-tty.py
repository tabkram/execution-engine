"""Give npm a terminal so its browser-based 2FA challenge can run in CI."""

import os
import pty
import sys


if __name__ == "__main__":
    sys.exit(os.waitstatus_to_exitcode(pty.spawn(["npm", *sys.argv[1:]])))
