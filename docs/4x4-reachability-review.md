# 4×4 reachability review

This review applies to ordinary 4×4 cubes with six solid colors, the fixed color scheme used by this project, and visually indistinguishable same-color centers. Picture cubes, marked centers, altered mechanisms, and custom color schemes are outside this model.

## Basis

Theorem 6.5 in Alexander Chuang's [*Analyzing the Rubik’s Cube Group of Various Sizes and Solution Methods*](https://math.uchicago.edu/~may/REU2021/REUPapers/Chuang%2CAlex.pdf) states reachability conditions for individually labeled 4×4 pieces: the corner twist sum is zero modulo three, edge orientations satisfy the piece-position constraint, and corner/center permutation parities agree. The source states the theorem but presents only the necessary-direction proof; it cites a further treatment for sufficiency.

For this application's unmarked centers, four centers of each color look the same. **Inference:** any particular assignment of labels to those centers can have its parity flipped by exchanging two identically colored center labels without changing a visible sticker. Thus a center labeling can be chosen to match either corner parity. This does not permit arbitrary color counts; every color must still occur four times among center positions after the corners and wings are accounted for.

## Mapping to the implementation

- `check4Entry` requires 16 stickers of each fixed color and checks that all eight corner identities occur exactly once with the correct handed order.
- It checks the corner-twist sum modulo three.
- It checks 24 wing identities using the colors and the sign of a scalar triple product. The sign is invariant under proper rotations and distinguishes the two wings of the same color pair.
- Once the required corner and wing identities and total counts hold, four center stickers remain of each color. The inference above explains why the labeled-center parity condition need not appear as a separate visible-color rejection.

The current tests include legal turns and whole-cube orientations, every single corner twist and wing flip, both reduced parity examples, and 200 piece-state conversion fixtures. These are evidence for the implementation, not a formal verification of its equivalence to the theorem. The solver independently replays returned moves, but a replay check does not prove the solver will find a solution for every valid input.

## Remaining release gate

Before enabling 4×4 solving by default, review the code-to-theorem mapping and existing test evidence, confirm the failure behavior for timeouts, and complete the third-party release-notice review. Physical-cube testing is deferred when unavailable and must remain explicitly unverified.
