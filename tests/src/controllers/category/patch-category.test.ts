import { deepFreeze } from "common/util/other";
import { Request } from "src/controllers/interface";
import makePatchCategory from "src/controllers/category/patch-category";
import EPP from "common/util/epp";

const categoryService = Object.freeze({
  editCategory: jest.fn(),
});

const patchCategory = makePatchCategory({ categoryService });

beforeEach(() => {
  Object.values(categoryService).forEach((method) => method.mockReset());
});

const validRequestObject: Request = deepFreeze({
  body: {},
  query: {},
  params: {},
  headers: {},
  method: "patch",
  path: "/categories",
});

describe("Validation", () => {
  it.each([
    {
      request: {
        ...validRequestObject,
        params: {},
        body: { changes: { name: "x" } },
      },
      errorCode: "MISSING_ID",
      case: `id is missing from params`,
    },
    {
      request: {
        ...validRequestObject,
        body: {},
        params: { id: "1" },
      },
      errorCode: "MISSING_CHANGES",
      case: `changes is missing from body`,
    },
  ])(`returns ewc "$errorCode" if $case`, async ({ errorCode, request }) => {
    const response = await patchCategory(request);
    expect(response).toEqual({
      body: {},
      error: { message: expect.any(String), code: errorCode },
    });

    Object.values(categoryService).forEach((method) => {
      expect(method).not.toHaveBeenCalled();
    });
  });
});

describe("Functionality", () => {
  it(`calls the categoryService.editCategory with the given id and changes and returns the response`, async () => {
    const id = "1";
    const changes = Object.freeze({ name: "study_hard" });

    const request = {
      ...validRequestObject,
      params: { id },
      body: { changes },
    };
    const fakeEditCategoryResponse = Object.freeze({ id, ...changes });
    categoryService.editCategory.mockResolvedValueOnce(
      fakeEditCategoryResponse
    );

    const response = await patchCategory(request);
    expect(response).toEqual({
      error: null,
      body: fakeEditCategoryResponse,
    });

    expect(categoryService.editCategory).toHaveBeenCalledTimes(1);
    expect(categoryService.editCategory).toHaveBeenCalledWith({ id, changes });
  });

  it(`returns the error thrown by categoryService.editCategory`, async () => {
    const id = "1";
    const changes = Object.freeze({ name: "study_hard" });
    const request = {
      ...validRequestObject,
      params: { id },
      body: { changes },
    };

    const error = new EPP(`No category exists with id: "${id}"`, "NOT_FOUND");
    categoryService.editCategory.mockRejectedValueOnce(error);

    const response = await patchCategory(request);
    expect(response).toEqual({
      body: {},
      error: { message: error.message, code: error.code },
    });

    expect(categoryService.editCategory).toHaveBeenCalledTimes(1);
    expect(categoryService.editCategory).toHaveBeenCalledWith({ id, changes });
  });
});
