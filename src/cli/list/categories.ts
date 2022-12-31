import {
  formatStr,
  getClient,
  printObjectAsBox,
  formatDateProperties,
  printErrorAndSetExitCode,
} from "../util";
import { Command, Option } from "commander";
import { printTables } from "../util/table";
import { CategoryFields } from "entities/category/category";
import { API_AND_SERVER_CONFIG as config } from "src/config/other";
import type { QuerySchemaInterface } from "src/controllers/category/get-categories";
import { printTree } from "flexible-tree-printer";

export function addListCategoriesCommand(ListCommand: Command) {
  ListCommand.command("categories")
    .description("Lists all the categories")
    .addOption(
      new Option("-i, --id <string>", "find category by id").conflicts("name")
    )
    .addOption(
      new Option("-n, --name <string>", "find category by name").conflicts([
        "id",
        "parents",
        "children",
      ])
    )
    .addOption(
      new Option("-p, --parents", "find parent categories").conflicts(
        "children"
      )
    )
    .addOption(
      new Option("-c, --children", "find sub-categories").conflicts("parent")
    )
    .addOption(new Option("--json", "print raw JSON.").conflicts(["tree"]))
    .addOption(
      new Option("-t, --tree", "print categories as a tree.").conflicts([
        "id",
        "name",
        "json",
        "parents",
        "children",
      ])
    )
    .action(listCategories);
}

type listCategories_Option = ({ json?: true } | { tree?: true }) &
  ({ id?: string } | { name?: string }) &
  ({ parents?: true } | { children?: true });

export async function listCategories(options: listCategories_Option) {
  let query: QuerySchemaInterface = (() => {
    if ("name" in options) return { lookup: "selfByName", name: options.name };
    if ("id" in options) {
      const { id } = options;
      if ("parents" in options) return { lookup: "parents", id };
      if ("children" in options) return { lookup: "children", id };
      else return { lookup: "selfById", id };
    }
    return { lookup: "all" };
  })();

  const client = await getClient();
  try {
    const response = await client.get(config.API_CATEGORY_PATH, { query });

    const body: any = response.body;
    if (!body.success) {
      printErrorAndSetExitCode(body.error);
      return;
    }

    if ("json" in options) {
      console.log(JSON.stringify(body.data));
      return;
    }

    if (Array.isArray(body.data)) {
      const categories = body.data as CategoryFields[];

      if ("tree" in options) printCategoriesAsTree(categories);
      else
        printTables({
          columns: ["id", "name", "parentId", "createdAt", "description"],
          objects: categories.map((category) =>
            formatDateProperties<CategoryFields>({
              object: category,
              dateProperties: ["createdAt"],
            })
          ),
        });
      return;
    }

    if (!body.data) {
      console.log(formatStr({ string: "Not found.", color: "red" }));
      return;
    }

    const { hash: _hash, ...category } = formatDateProperties<CategoryFields>({
      object: body.data,
      dateProperties: ["createdAt"],
    });
    printObjectAsBox({ object: category });
  } catch (ex) {
    printErrorAndSetExitCode(ex);
  } finally {
    client.close();
  }
}

function printCategoriesAsTree(categories: CategoryFields[]) {
  const tree = buildTree(categories);
  printTree({
    printRootNode: () =>
      console.log(formatStr({ string: ".", color: "yellow" })),
    parentNode: tree,
    getSubNodes: ({ parentNode }) =>
      parentNode.children.map((child: any) => ({
        name: child.name,
        value: child,
      })),
    printNode({ nodePrefix, node }) {
      const name = formatStr({ string: node.name, color: "green" });
      const prefix = formatStr({
        string: nodePrefix.join(""),
        color: "yellow",
      });
      const id = formatStr({ color: "grey", string: `(${node.value.id})` });
      const line = `${prefix}${name} ${id}`;
      console.log(line);
    },
  });
}

type Branch = CategoryFields & { children: Branch[]; isRoot: boolean };

interface Tree {
  [key: string | symbol]: Branch;
}

function buildTree(categories: CategoryFields[]) {
  const tree: Tree = {};
  const DEFAULT_ROOT_ID = Symbol();

  for (const category of categories) {
    const currentBranch: Branch = {
      ...category,
      isRoot: false,
      children: [] as Branch[],
    };

    if (category.id in tree) {
      currentBranch.children = tree[category.id]!.children;
      tree[category.id] = currentBranch;
    } else tree[category.id] = currentBranch;

    const parentId = category.parentId || DEFAULT_ROOT_ID;

    if (!tree[parentId]) {
      const parentBranch: Branch = {
        name: "",
        children: [],
        // @ts-ignore I know
        id: parentId,
        isRoot: true,
      };

      tree[parentId] = parentBranch;
    }

    tree[parentId]!.children.push(currentBranch);
  }

  if (tree[DEFAULT_ROOT_ID]) return tree[DEFAULT_ROOT_ID];
  for (const branch of Object.values(tree)) if (branch.isRoot) return branch;
  throw new Error("Parent not found");
}
