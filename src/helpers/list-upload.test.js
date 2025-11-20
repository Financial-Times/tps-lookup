const fs = require("fs");
const uploadToS3 = require("../aws/upload-to-s3.js");
const logger = require("../../helper/logger.js");

jest.mock("fs");
jest.mock("../aws/upload-to-s3.js");

const {
  writeChangesToTmpFile,
  uploadChangesToS3,
  buildChangeKeys,
  sanitiseListName
} = require("./list-upload.js");

describe("writeChangesToTmpFile", () => {
  it("writes a newline joined file to /tmp and returns path", () => {
    fs.writeFileSync.mockImplementation(() => {});

    const changes = ["000", "09898900000", "089898900000", "C"];
    const result = writeChangesToTmpFile(changes, "test.txt");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/tmp/test.txt",
      "000\n09898900000\n089898900000\nC",
      "utf8"
    );
    expect(result).toBe("/tmp/test.txt");
  });
});

describe("uploadChangesToS3", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("throws if changes is not an array", async () => {
    await expect(uploadChangesToS3("not-an-array", "key.txt"))
      .rejects
      .toThrow("Changes must be an array before uploading to S3");
  });

  it("skips upload when list is empty", async () => {
    await uploadChangesToS3([], "changes/tps/empty.txt");

    expect(logger.info).toHaveBeenCalledWith({
      event: "SKIP_UPLOAD_EMPTY_CHANGES_FILE",
      message: "No changes to upload, skipping S3 upload"
    });

    expect(uploadToS3).not.toHaveBeenCalled();
  });

  it("writes file and calls uploadToS3 when changes exist", async () => {
    fs.writeFileSync.mockImplementation(() => {});
    fs.createReadStream.mockReturnValue("stream");

    const changes = ["123", "456"];
    uploadToS3.mockResolvedValue("uploaded");

    const result = await uploadChangesToS3(changes, "changes/tps/2025/file.txt");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/tmp/file.txt",
      "123\n456",
      "utf8"
    );

    expect(logger.info).toHaveBeenCalledWith({
      event: "UPLOAD_CHANGES_FILE_TO_S3",
      key: "changes/tps/2025/file.txt",
      changesLength: 2,
    });

    expect(uploadToS3).toHaveBeenCalledWith("stream", "changes/tps/2025/file.txt");
    expect(result).toBe("uploaded");
  });
});

describe("buildChangeKeys", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2025-11-19T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("builds addition and deletion keys correctly", () => {
    const result = buildChangeKeys("tps.txt");

    expect(result).toEqual({
      additionsKey: "changes/tps/2025/11/19/tps_additions.txt",
      deletionsKey: "changes/tps/2025/11/19/tps_deletions.txt",
    });
  });

  it("handles filename with a path", () => {
    const result = buildChangeKeys("/var/data/ctps.raw.csv");

    expect(result).toEqual({
      additionsKey: "changes/ctps/2025/11/19/ctps_additions.txt",
      deletionsKey: "changes/ctps/2025/11/19/ctps_deletions.txt",
    });
  });
});

describe("sanitiseListName", () => {
  it("returns filename without extension", () => {
    expect(sanitiseListName("tps.txt")).toBe("tps");
  });

  it("lowercases the name", () => {
    expect(sanitiseListName("CTPS.TXT")).toBe("ctps");
  });

  it("handles full paths", () => {
    expect(sanitiseListName("/var/data/TPS.list.csv")).toBe("tps");
  });

  it("handles multiple dots", () => {
    expect(sanitiseListName("ctps.v2.latest.txt")).toBe("ctps");
  });

  it("handles empty filename", () => {
    expect(sanitiseListName("")).toBe("");
  });
});
