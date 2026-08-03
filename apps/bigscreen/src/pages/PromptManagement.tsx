import React from 'react';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { RoleListCard } from './prompt-management/RoleListCard';
import { RoleSkillBindingCard } from './prompt-management/RoleSkillBindingCard';
import { SkillLibraryCard } from './prompt-management/SkillLibraryCard';
import { RoleDialog } from './prompt-management/RoleDialog';
import { SkillDialog } from './prompt-management/SkillDialog';
import { BindSkillDialog } from './prompt-management/BindSkillDialog';
import { DeleteConfirmDialog } from './prompt-management/DeleteConfirmDialog';
import { DELETE_TYPE_LABELS } from './prompt-management/types';
import { usePromptManagementData } from './prompt-management/usePromptManagementData';
import { useRoleDialog } from './prompt-management/useRoleDialog';
import { useSkillDialog } from './prompt-management/useSkillDialog';
import { useBindDialog } from './prompt-management/useBindDialog';

const PromptManagement: React.FC = () => {
  const {
    roles,
    skills,
    loading,
    loadData,
    rolesCtrl,
    skillsCtrl,
    skillsPage,
    setSkillsPage,
    totalSkillsPages,
    paginatedSkills,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
  } = usePromptManagementData();

  const roleDialog = useRoleDialog(rolesCtrl, loadData);
  const skillDialog = useSkillDialog(skillsCtrl, loadData);
  const bindDialog = useBindDialog(rolesCtrl, skills, roles, loadData);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const currentRole = roles.find((r) => r.id === bindDialog.selectedRole);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid h-full gap-4 lg:grid-cols-3">
        <RoleListCard
          roles={roles}
          selectedRole={bindDialog.selectedRole}
          onSelectRole={bindDialog.setSelectedRole}
          onAdd={() => roleDialog.openDialog()}
          onEdit={roleDialog.openDialog}
          onRequestDelete={setDeleteTarget}
        />
        <RoleSkillBindingCard
          currentRole={currentRole}
          onBind={bindDialog.openDialog}
          onUnbind={(roleId, skillId) => rolesCtrl.removeSkill(roleId, skillId).then(loadData)}
        />
        <SkillLibraryCard
          skills={paginatedSkills}
          totalPages={totalSkillsPages}
          currentPage={skillsPage}
          onPageChange={setSkillsPage}
          onAdd={() => skillDialog.openDialog()}
          onEdit={skillDialog.openDialog}
          onRequestDelete={setDeleteTarget}
        />
      </div>

      <RoleDialog
        open={roleDialog.open}
        onOpenChange={roleDialog.setOpen}
        form={roleDialog.form}
        onFormChange={roleDialog.setForm}
        editingRole={roleDialog.editingRole}
        onSubmit={roleDialog.handleSubmit}
      />

      <SkillDialog
        open={skillDialog.open}
        onOpenChange={skillDialog.setOpen}
        form={skillDialog.form}
        onFormChange={skillDialog.setForm}
        editingSkill={skillDialog.editingSkill}
        onSubmit={skillDialog.handleSubmit}
      />

      <BindSkillDialog
        open={bindDialog.open}
        onOpenChange={bindDialog.setOpen}
        bindForm={bindDialog.bindForm}
        onFormChange={bindDialog.setBindForm}
        searchOpen={bindDialog.searchOpen}
        onSearchOpenChange={bindDialog.setSearchOpen}
        groupedAvailableSkills={bindDialog.groupedAvailableSkills}
        selectedSkill={bindDialog.selectedSkill}
        onSubmit={bindDialog.handleSubmit}
      />

      <DeleteConfirmDialog
        target={deleteTarget}
        labels={DELETE_TYPE_LABELS}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default PromptManagement;
