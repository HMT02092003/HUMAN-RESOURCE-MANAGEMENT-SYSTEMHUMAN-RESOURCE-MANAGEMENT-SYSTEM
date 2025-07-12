import { Request, Response } from "express";
import PermissionModel from "@/src/Models/PermissionModel";
import RolePermissionModel from "@/src/Models/RolePermissionModel";
import RoleModel from "@/src/Models/RoleModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";

// Define your model properties to match database schema
interface PermissionWithExtras extends PermissionModel {
  currentValue?: number | string; // Allow both number and string to fix type error
  scope?: string | number;
  key?: string; // Add key property to fix error
}

interface RoleWithPermissions extends RoleModel {
  permissions?: PermissionWithExtras[];
}

/**
 * Update permissions for a role
 */
export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      roleId: "number!",
      permissions: "object",
      scopes: "object"
    };

    let inputs = req.body;
    let auth = req.auth;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log("params", params);

    const { roleId, permissions, scopes } = params;

    if (!permissions) {
      return res.status(400).json({ error: "No data" });
    }

    // Check if role exists
    let role = await RoleModel.query().findById(roleId);
    if (!role) {
      return res.status(404).json({ error: "User role doesn't exist!" });
    }

    // Loop 1: Process permissions
    for (let key in permissions) {
      console.log("key", key);
      const value = permissions[key];

      // Check if permission exists
      const exist = await PermissionModel.query().where('key', key).first();
      if (!exist) {
        return res.status(404).json({ error: `${key} doesn't exist` });
      }

      // Get existing role permission
      const rolePermission = await RolePermissionModel.query()
        .where({ key, roleId: roleId })
        .first();

      // Check new permission value
      if (!value) {
        // Remove permission if value is falsy
        await RolePermissionModel.query().delete().where({ roleId: roleId, key });
      } else if (!rolePermission) {
        // Add new permission if it doesn't exist
        await RolePermissionModel.query().insert({
          key,
          roleId,
          permissionId: exist.id,
          value,
          createdBy: auth?.id
          // removed createdAt as it's not in your model
        });
      } else if (rolePermission.value != value) {
        // Update existing permission value
        await RolePermissionModel.query()
          .findById(rolePermission.id)
          .patch({
            value
            // removed updatedAt as it's not in your model
          });
      }
    }

    // Loop 2: Process scopes
    if (scopes) {
      for (let key in scopes) {
        const scope = scopes[key];

        // Check if permission exists
        const exist = await PermissionModel.query().where('key', key).first();
        if (!exist) {
          return res.status(404).json({ error: `${key} doesn't exist` });
        }

        // Get existing role permission
        const rolePermission = await RolePermissionModel.query()
          .where({ key, roleId: roleId })
          .first();

        if (!rolePermission) {
          // Skip scope update if permission not found
          console.log(`Permission for key ${key} not found, skipping scope update`);
          continue;
        }

        // Update scope if different from current value
        if (rolePermission.scope != scope) {
          await RolePermissionModel.query()
            .findById(rolePermission.id)
            .patch({
              scope
            });
        }
      }
    }

    return res.status(200).json({ message: "Update successfully" });
  } catch (error) {
    console.error("Error updating role permissions:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Get permissions for a specific role
 */
export const getPermissionsByRoleId = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!"
    };

    let inputs = req.params;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    // Check if role exists
    let role = await RoleModel.query().findById(params.id) as RoleWithPermissions;
    if (!role) {
      return res.status(404).json({ error: "User role doesn't exist!" });
    }

    // Get all permissions except 'root'
    let permissions = await PermissionModel.query().whereNot('key', 'root') as PermissionWithExtras[];

    // For each permission, check if it exists for this role
    for (let index in permissions) {
      let permission = permissions[index];

      // Get the permission key using type assertion since TypeScript can't see it
      const permissionObj = permission as any;
      const permissionKey = permissionObj.key;

      let result = await RolePermissionModel.query()
        .where('roleId', role.id)
        .where('key', permissionKey)
        .first();

      if (result) {
        // Use string value to avoid type error
        permissions[index].currentValue = result.value.toString();
        permissions[index].scope = result.scope ? result.scope.toString() : undefined;
      } else {
        permissions[index].currentValue = "0";
      }
    }

    // Attach permissions to role object
    role.permissions = permissions;

    return res.status(200).json([role]);
  } catch (error) {
    console.error("Error fetching permissions by role ID:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};