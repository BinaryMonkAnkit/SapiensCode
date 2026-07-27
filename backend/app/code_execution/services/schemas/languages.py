"""
Per-language configuration for the Docker-based code runner.

Each entry describes, for one language:
  - filename:   what the submitted code gets saved as inside the workspace
  - build_cmd:  argv list to compile the code first, or None if it can run directly
  - run_cmd:    argv list to actually execute the (possibly compiled) program

Both build_cmd and run_cmd are run inside the sandbox container, in its
/workspace directory, as the container's own non-root user.

To support a new language: add its filename/build/run here, and make sure
the interpreter/compiler is installed in the sandbox image (see Dockerfile).
"""

"""
Per-language configuration for the Docker-based code runner.

Each entry describes, for one language:
  - filename:   what the submitted code gets saved as inside the workspace
  - build_cmd:  argv list to compile the code first, or None if it can run directly
  - run_cmd:    argv list to actually execute the (possibly compiled) program

Both build_cmd and run_cmd are run inside the sandbox container, in its
/workspace directory, as the container's own non-root user.

IMPORTANT - output buffering: when a program's stdout is a pipe rather
than a real terminal (which is exactly the case here), C/C++/Java's
standard I/O libraries switch from line-buffered to fully-buffered mode.
That means something like C's `printf("Enter your name: ")` with no
trailing newline just sits in an internal buffer instead of actually being
written out, so the prompt never reaches the browser until the program
happens to flush or exit, at which point it looks like input isn't
working. `stdbuf -o0 -e0` forces unbuffered stdout/stderr for a command,
so those prompts show up immediately, the same as Python does via its own
`-u` flag. `stdbuf` ships as part of GNU coreutils, already installed in
the sandbox image.
"""

UNBUFFERED = ["stdbuf", "-o0", "-e0"]

LANGUAGES = {
    "py": {
        "filename": "main.py",
        "build_cmd": None,
        "run_cmd": ["python3", "-u", "main.py"],
    },
    "python": {
        "filename": "main.py",
        "build_cmd": None,
        "run_cmd": ["python3", "-u", "main.py"],
    },
    "js": {
        "filename": "main.js",
        "build_cmd": None,
        "run_cmd": UNBUFFERED + ["node", "main.js"],
    },
    "javascript": {
        "filename": "main.js",
        "build_cmd": None,
        "run_cmd": UNBUFFERED + ["node", "main.js"],
    },
    "java": {
        # The submitted code must declare `public class Main`, since the
        # filename and the run command both assume that class name.
        "filename": "Main.java",
        "build_cmd": ["javac", "Main.java"],
        "run_cmd": UNBUFFERED + ["java", "Main"],
    },
    "c": {
        "filename": "main.c",
        "build_cmd": ["gcc", "main.c", "-o", "main.out"],
        "run_cmd": UNBUFFERED + ["./main.out"],
    },
    "cpp": {
        "filename": "main.cpp",
        "build_cmd": ["g++", "main.cpp", "-o", "main.out"],
        "run_cmd": UNBUFFERED + ["./main.out"],
    },
}


def supported_languages_summary() -> str:
    return ", ".join(sorted(set(LANGUAGES.keys())))