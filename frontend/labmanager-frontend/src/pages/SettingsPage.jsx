import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Shield, CreditCard } from 'lucide-react';
import LabSettingsPage from './LabSettingsPage';
import PlansPage from './PlansPage';
import EmployeesTab from '../components/settings/EmployeesTab';
import AuthorizationsTab from '../components/settings/AuthorizationsTab';
import MyProfileTab from '../components/settings/MyProfileTab';
import usePermissions from '../hooks/usePermissions';

export default function SettingsPage() {
    const { can } = usePermissions();

    // Set default tab based on what the user can see
    const defaultTab = 'profile';
    const [activeTab, setActiveTab] = useState(defaultTab);

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/50">
            <div className="border-b bg-white px-6 py-4">
                <h1 className="text-2xl font-bold flex items-center text-gray-800">
                    <Settings className="w-6 h-6 mr-2 text-blue-600" />
                    Configurações
                </h1>
                <p className="text-gray-500 mt-1">Gerencie as preferências e permissões do sistema</p>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-white border p-1 rounded-lg shadow-sm">
                            <TabsTrigger value="profile" className="flex items-center px-4 py-2">
                                <Users className="w-4 h-4 mr-2" />
                                Meu Perfil
                            </TabsTrigger>
                            {can('auth_settings') && (
                                <TabsTrigger value="lab" className="flex items-center px-4 py-2">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Laboratório
                                </TabsTrigger>
                            )}
                            {can('employees') && (
                                <TabsTrigger value="employees" className="flex items-center px-4 py-2">
                                    <Users className="w-4 h-4 mr-2" />
                                    Funcionários
                                </TabsTrigger>
                            )}
                            {can('auth_settings') && (
                                <TabsTrigger value="authorizations" className="flex items-center px-4 py-2">
                                    <Shield className="w-4 h-4 mr-2" />
                                    Autorizações
                                </TabsTrigger>
                            )}
                            {can('auth_settings') && (
                                <TabsTrigger value="plans" className="flex items-center px-4 py-2">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Planos e Assinatura
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="profile" className="m-0 border-none p-0 outline-none">
                            <MyProfileTab />
                        </TabsContent>

                        {can('auth_settings') && (
                            <TabsContent value="lab" className="m-0 border-none p-0 outline-none">
                                <LabSettingsPage embedded={true} />
                            </TabsContent>
                        )}

                        {can('employees') && (
                            <TabsContent value="employees" className="m-0 border-none p-0 outline-none">
                                <EmployeesTab />
                            </TabsContent>
                        )}

                        {can('auth_settings') && (
                            <TabsContent value="authorizations" className="m-0 border-none p-0 outline-none">
                                <AuthorizationsTab />
                            </TabsContent>
                        )}

                        {can('auth_settings') && (
                            <TabsContent value="plans" className="m-0 border-none p-0 outline-none">
                                <PlansPage embedded={true} />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
