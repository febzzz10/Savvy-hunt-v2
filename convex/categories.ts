import { query } from "./_generated/server";
import { v } from "convex/values";
export const listCurrent=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>ctx.db.query("categories").withIndex("by_edition_sort",q=>q.eq("editionId",editionId)).collect()});
