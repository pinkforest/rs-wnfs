///<reference path="server/index.d.ts"/>

import { expect, test } from "@playwright/test";

const url = "http://localhost:8085";

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});

test.describe("PrivateDirectory", () => {
  test("lookupNode can fetch file added to directory", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.write(
        ["text.txt"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        initialForest,
        store,
        rng
      );

      return await rootDir.lookupNode("text.txt", true, forest, store);
    });

    expect(result).toBeDefined();
  });

  test("lookupNode cannot fetch file not added to directory", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      return await root.lookupNode("Unknown", true, initialForest, store);
    });

    expect(result).toBe(undefined);
  });

  test("mkdir can create new directory", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.mkdir(
        ["pictures", "cats"],
        true,
        new Date(),
        initialForest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.write(
        ["pictures", "cats", "tabby.png"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir } = await rootDir.getNode(
        ["pictures", "cats", "tabby.png"],
        true,
        forest,
        store
      );

      return rootDir;
    });

    expect(result).toBeDefined();
  });

  test("ls can list children under directory", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.mkdir(
        ["pictures", "dogs"],
        true,
        new Date(),
        initialForest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.write(
        ["pictures", "cats", "tabby.png"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        forest,
        store,
        rng
      );

      var { result } = await rootDir.ls(["pictures"], true, forest, store);

      return result;
    });

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("cats");
    expect(result[1].name).toBe("dogs");
  });

  test("rm can remove children from directory", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.write(
        ["pictures", "dogs", "billie.jpeg"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        initialForest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.write(
        ["pictures", "cats", "tabby.png"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.rm(
        ["pictures", "cats"],
        true,
        forest,
        store,
        rng
      );

      var { result } = await rootDir.ls(["pictures"], true, forest, store);

      return result;
    });

    expect(result.length).toEqual(1);
    expect(result[0].name).toEqual("dogs");
  });

  test("basicMv can move content between directories", async ({ page }) => {
    const [imagesContent, picturesContent] = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.write(
        ["pictures", "cats", "luna.jpeg"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        initialForest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.write(
        ["pictures", "cats", "tabby.png"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.mkdir(
        ["images"],
        true,
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.basicMv(
        ["pictures", "cats"],
        ["images", "cats"],
        true,
        new Date(),
        forest,
        store,
        rng
      );

      var { result: imagesContent, forest } = await rootDir.ls(
        ["images"],
        true,
        forest,
        store
      );

      var { result: picturesContent, forest } = await rootDir.ls(
        ["pictures"],
        true,
        forest,
        store
      );

      return [imagesContent, picturesContent];
    });

    expect(imagesContent.length).toEqual(1);
    expect(picturesContent.length).toEqual(0);
    expect(imagesContent[0].name).toEqual("cats");
  });

  test("cp can copy content between directories", async ({ page }) => {
    const [imagesContent, picturesContent] = await page.evaluate(async () => {
      const {
        wnfs: { PrivateDirectory, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const root = new PrivateDirectory(new Namefilter(), new Date(), rng);

      var { rootDir, forest } = await root.write(
        ["pictures", "cats", "luna.jpeg"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        initialForest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.write(
        ["pictures", "cats", "tabby.png"],
        true,
        new Uint8Array([1, 2, 3, 4, 5]),
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.mkdir(
        ["images"],
        true,
        new Date(),
        forest,
        store,
        rng
      );

      var { rootDir, forest } = await rootDir.cp(
        ["pictures", "cats"],
        ["images", "cats"],
        true,
        new Date(),
        forest,
        store,
        rng
      );

      var { result: imagesContent, forest } = await rootDir.ls(
        ["images"],
        true,
        forest,
        store
      );

      var { result: picturesContent, forest } = await rootDir.ls(
        ["pictures"],
        true,
        forest,
        store
      );

      return [imagesContent, picturesContent];
    });

    expect(imagesContent.length).toEqual(1);
    expect(picturesContent.length).toEqual(1);

    expect(imagesContent[0].name).toEqual("cats");
    expect(picturesContent[0].name).toEqual("cats");
  });
});

test.describe("PrivateFile", () => {
  test("empty can create empty file", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateFile, Namefilter },
        mock: { Rng },
      } = await window.setup();

      const rng = new Rng();
      const file = new PrivateFile(new Namefilter(), new Date(), rng);

      return file.getId();
    });

    expect(result).toBeDefined();
  });

  test("withContent can create file with content", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { PrivateFile, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const forest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      const [file] = await PrivateFile.withContent(
        new Namefilter(),
        new Date(),
        new Uint8Array([1, 2, 3, 4, 5]),
        forest,
        store,
        rng
      );

      return file.getId();
    });

    expect(result).toBeDefined();
  });

  test("getContent can fetch file's entire content", async ({ page }) => {
    const [length, type] = await page.evaluate(async () => {
      const {
        wnfs: { PrivateFile, PrivateForest, Namefilter },
        mock: { MemoryBlockStore, Rng },
      } = await window.setup();

      const initialForest = new PrivateForest();
      const rng = new Rng();
      const store = new MemoryBlockStore();
      var [file, forest] = await PrivateFile.withContent(
        new Namefilter(),
        new Date(),
        new Uint8Array([1, 2, 3, 4, 5]),
        initialForest,
        store,
        rng
      );

      let content = await file.getContent(forest, store);

      return [content.length, content.constructor.name, content];
    });

    expect(length).toEqual(5);
    expect(type).toEqual("Uint8Array");
  });

  test("A PrivateDirectory has the correct metadata", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { Namefilter, PrivateDirectory },
        mock: { Rng },
      } = await window.setup();

      const time = new Date();
      return new PrivateDirectory(new Namefilter(), time, new Rng()).metadata();
    });

    expect(result.created).not.toBeUndefined();
  });

  test("A PrivateFile has the correct metadata", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const {
        wnfs: { Namefilter, PrivateFile },
        mock: { Rng }
      } = await window.setup();

      const time = new Date();
      return new PrivateFile(new Namefilter(), time, new Rng()).metadata();
    });

    expect(result.created).not.toBeUndefined();
  });
});
