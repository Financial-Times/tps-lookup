const fs = require('fs');

const { getDeletions, getAdditions } = require('./deletions-and-additions');

const TMP_OLD = '/tmp/diff_old.txt';
const TMP_NEW = '/tmp/diff_new.txt';

describe('getDeletions and getAdditions compute the differences correctly', () => {
  afterEach(() => {
    try {
      fs.unlinkSync(TMP_OLD);
    } catch {}
    try {
      fs.unlinkSync(TMP_NEW);
    } catch {}
  });

  test('computes deletions and additions correctly with number differences and ordering differences', () => {
    const oldFileContents =
      ['0101', '0202', '0303', '0404'].join('\r\n') + '\r\n';

    const newFileContents =
      ['0202', '0303', '0505', '0606'].join('\r\n') + '\r\n';

    fs.writeFileSync(TMP_OLD, oldFileContents);
    fs.writeFileSync(TMP_NEW, newFileContents);

    const deletions = getDeletions(TMP_OLD, TMP_NEW);
    const additions = getAdditions(TMP_OLD, TMP_NEW);

    expect(deletions).toEqual(['0101', '0404']);
    expect(additions).toEqual(['0505', '0606']);
  });

  test('returns empty arrays when files are identical after normalisation', () => {
    const lines = ['1111', '2222', '3333'];
    const oldFileContents = lines.join('\r\n') + '\r\n';
    const newFileContents = ['3333', '2222', '1111'].join('\r\n') + '\r\n';

    fs.writeFileSync(TMP_OLD, oldFileContents);
    fs.writeFileSync(TMP_NEW, newFileContents);

    const deletions = getDeletions(TMP_OLD, TMP_NEW);
    const additions = getAdditions(TMP_OLD, TMP_NEW);

    expect(deletions).toEqual([]);
    expect(additions).toEqual([]);
  });
});
